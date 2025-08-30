"""Add email_connections table

Revision ID: 2025083021_add_email_connections
Revises: d4524d3c24bb
Create Date: 2025-08-30 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2025083021_add_email_connections'
down_revision: Union[str, Sequence[str], None] = 'd4524d3c24bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create email_connections table
    op.create_table(
        'email_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_address', sa.String(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False, server_default='google'),
        sa.Column('provider_account_id', sa.String(), nullable=False),
        sa.Column('connection_name', sa.String(), nullable=True),
        sa.Column('access_token_encrypted', sa.Text(), nullable=False),
        sa.Column('refresh_token_encrypted', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scopes_granted', sa.String(), nullable=False),
        sa.Column('connection_status', sa.String(), nullable=False, server_default='active'),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('oauth_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create indexes
    op.create_index(op.f('ix_email_connections_id'), 'email_connections', ['id'], unique=False)
    op.create_index(op.f('ix_email_connections_user_id'), 'email_connections', ['user_id'], unique=False)
    op.create_index(op.f('ix_email_connections_email_address'), 'email_connections', ['email_address'], unique=False)
    op.create_index(op.f('ix_email_connections_provider_account_id'), 'email_connections', ['provider_account_id'], unique=False)
    
    # Create composite indexes
    op.create_index('ix_email_connections_user_email', 'email_connections', ['user_id', 'email_address'], unique=False)
    op.create_index('ix_email_connections_status', 'email_connections', ['user_id', 'connection_status'], unique=False)
    op.create_index('ix_email_connections_provider', 'email_connections', ['user_id', 'provider'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_email_connections_provider', table_name='email_connections')
    op.drop_index('ix_email_connections_status', table_name='email_connections')
    op.drop_index('ix_email_connections_user_email', table_name='email_connections')
    op.drop_index(op.f('ix_email_connections_provider_account_id'), table_name='email_connections')
    op.drop_index(op.f('ix_email_connections_email_address'), table_name='email_connections')
    op.drop_index(op.f('ix_email_connections_user_id'), table_name='email_connections')
    op.drop_index(op.f('ix_email_connections_id'), table_name='email_connections')
    
    # Drop table
    op.drop_table('email_connections')