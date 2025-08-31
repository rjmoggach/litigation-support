"""Fix document smart text relationship

Revision ID: a579e8a1
Revises: adf3d7b0
Create Date: 2025-08-31 00:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a579e8a1'
down_revision: Union[str, Sequence[str], None] = 'adf3d7b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove the smart_text_id column from case_documents (circular reference)
    op.drop_constraint('case_documents_smart_text_id_fkey', 'case_documents', type_='foreignkey')
    op.drop_column('case_documents', 'smart_text_id')


def downgrade() -> None:
    """Downgrade schema."""
    # Re-add the smart_text_id column
    op.add_column('case_documents', sa.Column('smart_text_id', sa.Integer(), nullable=True))
    op.create_foreign_key('case_documents_smart_text_id_fkey', 'case_documents', 'document_smart_text', ['smart_text_id'], ['id'], ondelete='SET NULL')