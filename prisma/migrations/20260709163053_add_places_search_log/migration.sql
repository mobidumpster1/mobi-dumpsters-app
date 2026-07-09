-- CreateTable
CREATE TABLE "PlacesSearchLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacesSearchLog_pkey" PRIMARY KEY ("id")
);
