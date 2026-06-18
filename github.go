package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

const graphqlURL = "https://api.github.com/graphql"

type ghClient struct {
	token string
}

func newGHClient(token string) *ghClient {
	return &ghClient{token: token}
}

func (c *ghClient) query(query string, vars map[string]interface{}) ([]byte, error) {
	body := map[string]interface{}{"query": query, "variables": vars}
	b, _ := json.Marshal(body)

	req, err := http.NewRequest("POST", graphqlURL, strings.NewReader(string(b)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "GitViz")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	out, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var gqlResp struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(out, &gqlResp); err != nil {
		return nil, fmt.Errorf("json: %w", err)
	}
	if len(gqlResp.Errors) > 0 {
		return nil, fmt.Errorf("graphql: %s", gqlResp.Errors[0].Message)
	}
	return gqlResp.Data, nil
}

func fetchRepoData(owner, repo, token string) (*RepoData, error) {
	if token == "" {
		return nil, fmt.Errorf("no token available")
	}

	c := newGHClient(token)

	q := `
	query($owner: String!, $repo: String!) {
		repository(owner: $owner, name: $repo) {
			name
			description
			url
			stargazerCount
			forkCount
			issues(states: OPEN) { totalCount }
			pullRequests(states: OPEN) { totalCount }
			licenseInfo { name }
			primaryLanguage { name }
			languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
				edges {
					size
					node { name color }
				}
			}
			defaultBranchRef {
				target {
					... on Commit {
						history(first: 100) {
							totalCount
							edges {
								node {
									committedDate
									author { name user { login avatarUrl } }
									additions deletions changedFiles
								}
							}
						}
					}
				}
			}
			releases(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
				nodes { name tagName publishedAt url }
			}
		}
	}`

	data, err := c.query(q, map[string]interface{}{"owner": owner, "repo": repo})
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Repository struct {
			Name            string `json:"name"`
			Description     string `json:"description"`
			URL             string `json:"url"`
			StargazerCount  int    `json:"stargazerCount"`
			ForkCount       int    `json:"forkCount"`
			Issues          struct { TotalCount int } `json:"issues"`
			PullRequests    struct { TotalCount int } `json:"pullRequests"`
			LicenseInfo     *struct { Name string } `json:"licenseInfo"`
			PrimaryLanguage *struct { Name string } `json:"primaryLanguage"`
			Languages       struct {
				Edges []struct {
					Size int `json:"size"`
					Node struct {
						Name  string `json:"name"`
						Color string `json:"color"`
					} `json:"node"`
				} `json:"edges"`
			} `json:"languages"`
			DefaultBranchRef *struct {
				Target struct {
					History struct {
						TotalCount int `json:"totalCount"`
						Edges []struct {
							Node struct {
								CommittedDate string `json:"committedDate"`
								Author        *struct {
									Name string `json:"name"`
									User *struct {
										Login     string `json:"login"`
										AvatarURL string `json:"avatarUrl"`
									} `json:"user"`
								} `json:"author"`
								Additions     int `json:"additions"`
								Deletions     int `json:"deletions"`
								ChangedFiles  int `json:"changedFiles"`
							} `json:"node"`
						} `json:"edges"`
					} `json:"history"`
				} `json:"target"`
			} `json:"defaultBranchRef"`
			Releases struct {
				Nodes []struct {
					Name        string `json:"name"`
					TagName     string `json:"tagName"`
					PublishedAt string `json:"publishedAt"`
					URL         string `json:"url"`
				} `json:"nodes"`
			} `json:"releases"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(data, &parsed); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}

	r := parsed.Repository
	result := &RepoData{
		FullName:    owner + "/" + r.Name,
		Description: r.Description,
		URL:         r.URL,
		Stars:       r.StargazerCount,
		Forks:       r.ForkCount,
		OpenIssues:  r.Issues.TotalCount,
		OpenPRs:     r.PullRequests.TotalCount,
		Owner:       owner,
		Repo:        r.Name,
		FetchedAt:   time.Now(),
	}

	if r.LicenseInfo != nil {
		result.License = r.LicenseInfo.Name
	}
	if r.PrimaryLanguage != nil {
		result.PrimaryLang = r.PrimaryLanguage.Name
	}

	var totalLangBytes int
	for _, e := range r.Languages.Edges {
		totalLangBytes += e.Size
	}
	for _, e := range r.Languages.Edges {
		pct := 0.0
		if totalLangBytes > 0 {
			pct = float64(e.Size) / float64(totalLangBytes) * 100
		}
		result.Languages = append(result.Languages, LangEntry{
			Name: e.Node.Name, Bytes: e.Size, Color: e.Node.Color, Pct: pct,
		})
	}

	if r.DefaultBranchRef != nil {
		edges := r.DefaultBranchRef.Target.History.Edges
		result.Stats.TotalCommits = r.DefaultBranchRef.Target.History.TotalCount

		authorMap := make(map[string]*AuthorStat)
		weekMap := make(map[string]int)

		for _, e := range edges {
			n := e.Node
			result.Stats.TotalAdditions += n.Additions
			result.Stats.TotalDeletions += n.Deletions

			login := "unknown"
			name := n.Author.Name
			avatar := ""
			if n.Author.User != nil {
				login = n.Author.User.Login
				avatar = n.Author.User.AvatarURL
			} else if name != "" {
				login = name
			}

			if _, ok := authorMap[login]; !ok {
				authorMap[login] = &AuthorStat{Login: login, Name: name, AvatarURL: avatar}
			}
			authorMap[login].Commits++
			authorMap[login].Additions += n.Additions
			authorMap[login].Deletions += n.Deletions

			if t, err := time.Parse(time.RFC3339, n.CommittedDate); err == nil {
				week := t.Format("2006-01-02")
				weekMap[week]++
			}
		}

		var totalChanges int
		var authors []AuthorStat
		for _, a := range authorMap {
			authors = append(authors, *a)
			totalChanges += a.Additions + a.Deletions
		}
		sort.Slice(authors, func(i, j int) bool {
			return authors[i].Commits > authors[j].Commits
		})
		for i := range authors {
			if totalChanges > 0 {
				authors[i].Pct = float64(authors[i].Additions+authors[i].Deletions) / float64(totalChanges) * 100
			}
		}
		result.Stats.Authors = authors

		var weeks []WeekBucket
		for w, c := range weekMap {
			weeks = append(weeks, WeekBucket{Week: w, Commits: c})
		}
		sort.Slice(weeks, func(i, j int) bool { return weeks[i].Week < weeks[j].Week })
		result.Stats.WeeklyCommits = weeks

		// bus factor: minimum authors to reach 50% of total changes
		sorted := make([]AuthorStat, len(authors))
		copy(sorted, authors)
		sort.Slice(sorted, func(i, j int) bool {
			return sorted[i].Additions+sorted[i].Deletions > sorted[j].Additions+sorted[j].Deletions
		})
		half := totalChanges / 2
		cumulative := 0
		for i, a := range sorted {
			cumulative += a.Additions + a.Deletions
			if cumulative >= half {
				result.Stats.BusFactor = i + 1
				result.Stats.BusFactorPct = float64(cumulative) / float64(totalChanges) * 100
				break
			}
		}
	}

	for _, n := range r.Releases.Nodes {
		result.Releases = append(result.Releases, ReleaseEntry{
			Name: n.Name, TagName: n.TagName,
			Published: n.PublishedAt, URL: n.URL,
		})
	}

	return result, nil
}
