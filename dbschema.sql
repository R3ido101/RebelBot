BEGIN TRANSACTION;
CREATE TABLE "quotes" (
	`ID`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	`res`	TEXT,
	`chan`	INTEGER
);
CREATE TABLE `commands` (
	`chanID`	INTEGER,
	`name`	TEXT,
	`response`	TEXT
);
COMMIT;
