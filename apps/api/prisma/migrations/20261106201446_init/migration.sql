-- CreateTable
CREATE TABLE "AnalyzedGame" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "endTime" INTEGER NOT NULL,
    "meta" JSONB NOT NULL,
    "analysis" JSONB NOT NULL,
    "schema" INTEGER NOT NULL,
    "engine" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyzedGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyzedGame_username_endTime_idx" ON "AnalyzedGame"("username", "endTime" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzedGame_username_gameId_key" ON "AnalyzedGame"("username", "gameId");
