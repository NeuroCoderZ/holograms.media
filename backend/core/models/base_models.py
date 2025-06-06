from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime, timezone # Ensure timezone is imported
from typing import Optional

# From original backend/core/models/base_models.py
def current_time_utc() -> datetime:
    return datetime.now(timezone.utc)

class CoreModel(BaseModel):
    pass

class IDModel(CoreModel):
    id: UUID = Field(default_factory=uuid4, alias="_id") # alias for MongoDB compatibility if ever needed

class TimestampModel(CoreModel):
    created_at: datetime = Field(default_factory=current_time_utc)
    updated_at: Optional[datetime] = Field(default_factory=current_time_utc) # Needs to be updated on modification

    # Pydantic model config for ORM mode or other features if needed later
    # class Config:
    #     orm_mode = True
    #     validate_assignment = True

class BaseUUIDModel(IDModel, TimestampModel):
    """A base model with UUID id and timestamps"""
    pass

# Example of how to update 'updated_at' automatically (more advanced, for future consideration)
# from pydantic import validator
# class AutoTimestampModel(TimestampModel):
#     @validator('updated_at', always=True)
#     def set_updated_at(cls, v, values):
#         return current_time_utc()
#
# class AnotherBaseModel(IDModel, AutoTimestampModel):
#     pass

# Content from backend/models/base_models.py
# Ensure uuid is imported if not already (it is: from uuid import UUID, uuid4)
# Ensure datetime is imported if not already (it is: from datetime import datetime, timezone)

class DBBaseModel(BaseModel):
    """
    A base model for database interaction that includes common fields.
    Can be inherited by other Pydantic models representing database table rows.
    """
    id: int = Field(..., description="Primary key, typically auto-generated by the database.")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of creation (UTC).")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of last update (UTC).")

    class Config:
        orm_mode = True # Allows Pydantic to work with ORM objects
        # Using `alias_generator` can be helpful if your DB columns have different naming conventions
        # e.g., camelCase in Python and snake_case in SQL.
        # However, for this project, we'll aim for consistent naming if possible.


class UUIDDBBaseModel(BaseModel):
    """
    A base model for database interaction where the primary key is a UUID.
    """
    id: UUID = Field(default_factory=uuid4, description="Primary key, UUID.") # Changed from uuid.uuid4 to uuid4
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of creation (UTC).")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of last update (UTC).")

    class Config:
        orm_mode = True

# Note: datetime.utcnow is used in the appended models.
# The original core models used datetime.now(timezone.utc).
# For consistency, datetime.utcnow could be replaced with current_time_utc,
# but I will keep it as is for now to strictly follow the "append" instruction for distinct models.
# If these models were to be truly merged/harmonized, this would be a point of reconciliation.

# Example of a model that could inherit from DBBaseModel:
# class MyTableModel(DBBaseModel):
#     name: str
#     description: Optional[str] = None

# If many models share a user_id (Firebase UID), you could consider a base for that too:
# class UserOwnedModelBase(BaseModel):
#     user_id: str = Field(..., description="Firebase UID of the owner/user.")
#
# class MyUserOwnedData(UserOwnedModelBase, DBBaseModel): # Example of multiple inheritance
#     data_field: str
