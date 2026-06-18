package main

import "encoding/hex"

var xorKey = []byte{
	0x47, 0x37, 0x23, 0x6d, 0x4b, 0x21, 0x39, 0x78,
	0x52, 0x32, 0x40, 0x70, 0x4c, 0x77, 0x35, 0x6e,
	0x51, 0x38, 0x24, 0x76, 0x4a, 0x33, 0x5e, 0x62,
	0x59, 0x36, 0x26, 0x64, 0x46, 0x30, 0x2a, 0x65,
	0x48,
}

var (
	encClientID     = "0e41115e2855773f255c21043547475f015b690f"
	encClientSecret = "22551a0b7f110a1d365724472d44040c68591213290238063b504255240712012d215117547a4209"
	encToken        = "205f4c320a187708116509487b2e5205075a103313542e53307d121130615023700607703c0d756b"
	encImgBB        = "72051a0e72450a41375772427e14575d63091145790b3d046a53130577091c5c"
)

func xorDecrypt(encHex string) string {
	data, err := hex.DecodeString(encHex)
	if err != nil {
		return ""
	}
	out := make([]byte, len(data))
	for i := range data {
		out[i] = data[i] ^ xorKey[i%len(xorKey)]
	}
	return string(out)
}

func getDecryptedClientID() string     { return xorDecrypt(encClientID) }
func getDecryptedClientSecret() string { return xorDecrypt(encClientSecret) }
func getDecryptedToken() string        { return xorDecrypt(encToken) }
func getDecryptedImgBB() string        { return xorDecrypt(encImgBB) }
