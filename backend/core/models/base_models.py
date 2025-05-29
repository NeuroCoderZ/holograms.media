from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Optional

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
