"""Apply the idempotent local showcase seed to the configured development DB."""

from pathlib import Path
from urllib.parse import urlsplit

import psycopg

from proofprint.infrastructure.database import Settings


def main() -> None:
    database_url = Settings().database_url
    target = urlsplit(database_url)
    if target.hostname not in {"127.0.0.1", "localhost"} or target.path != "/proofprint":
        raise SystemExit("Showcase seed is restricted to a local proofprint database")

    sql_file = Path(__file__).with_name("seed_showcase.sql")
    script = "\n".join(
        line for line in sql_file.read_text(encoding="utf-8").splitlines()
        if not line.lstrip().startswith("\\set") and line.strip() not in {"BEGIN;", "COMMIT;"}
    )
    psycopg_url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    with psycopg.connect(psycopg_url) as conn, conn.cursor() as cursor:
        for statement in script.split(";"):
            if statement.strip():
                cursor.execute(statement)
        for status, record, count in cursor.fetchall():
            print(f"{status:22} {record:10} {count}")


if __name__ == "__main__":
    main()
