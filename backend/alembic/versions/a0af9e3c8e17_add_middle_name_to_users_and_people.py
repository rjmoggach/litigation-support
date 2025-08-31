"""add_middle_name_to_users_and_people

Revision ID: a0af9e3c8e17
Revises: e31070a73e61
Create Date: 2025-08-31 15:59:10.073751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0af9e3c8e17'
down_revision: Union[str, Sequence[str], None] = 'e31070a73e61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add middle_name to people table
    op.add_column('people', sa.Column('middle_name', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_people_middle_name'), 'people', ['middle_name'], unique=False)
    
    # Add first_name, middle_name, last_name to users table
    op.add_column('users', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('middle_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove columns from users table
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'middle_name') 
    op.drop_column('users', 'first_name')
    
    # Remove middle_name from people table
    op.drop_index(op.f('ix_people_middle_name'), table_name='people')
    op.drop_column('people', 'middle_name')
