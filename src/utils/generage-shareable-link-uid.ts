import { customAlphabet } from "nanoid";
import { SHARE_LINK_UID_LENGTH } from "../types/types";

const generateCustomNanoid = customAlphabet(
	"0123456789abcdefghijklmnopqrstuvwxyz",
	SHARE_LINK_UID_LENGTH
);

export function generateSharableLinkUid() {
	return generateCustomNanoid();
}
