from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared SQLAlchemy registry for all persistence models."""

