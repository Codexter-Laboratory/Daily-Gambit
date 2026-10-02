-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "PuzzleRushSnapshot" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "attemptsTotal" INTEGER,
    "scoreTotal" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuzzleRushSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPuzzleCheckin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPuzzleCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PuzzleRushSnapshot_username_asOf_idx" ON "PuzzleRushSnapshot"("username", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleRushSnapshot_username_asOf_key" ON "PuzzleRushSnapshot"("username", "asOf");

-- CreateIndex
CREATE INDEX "DailyPuzzleCheckin_username_asOf_idx" ON "DailyPuzzleCheckin"("username", "asOf");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPuzzleCheckin_username_asOf_key" ON "DailyPuzzleCheckin"("username", "asOf");

