--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
CREATE TABLE Syncdata (
    appname     TEXT        NOT NULL,
    apptoken    TEXT        NOT NULL,
    type        TEXT        NOT NULL,
    syncdata    TEXT        NOT NULL,
    timestamp   DATETIME    DEFAULT CURRENT_TIMESTAMP
)

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------
DROP TABLE Syncdata;
