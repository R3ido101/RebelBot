export function logInfo(label, msg) {
	if (label.startsWith("[") && label.endsWith("]")) {
		console.log("[INFO] " + label + ": " + msg);
	} else if (label.startsWith("[") && label.endsWith(":")) {
		console.log("[INFO] " + label + " " + msg);
	} else {
		console.log("[INFO] " + "[" + label + "]: " + msg);
	}
}

export function logError(label, msg) {
	if (label.startsWith("[") && label.endsWith("]")) {
		console.log("[ERROR] " + label + ": " + msg);
	} else if (label.startsWith("[") && label.endsWith(":")) {
		console.log("[ERROR] " + label + " " + msg);
	} else {
		console.log("[ERROR] " + "[" + label + "]: " + msg);
	}
}
