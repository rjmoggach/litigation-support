"""Add cases tables

Revision ID: adf3d7b0
Revises: d4524d3c24bb
Create Date: 2025-08-30 23:54:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'adf3d7b0'
down_revision: Union[str, Sequence[str], None] = '79adcfdc5037'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create cases table
    op.create_table('cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('court_file_number', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('case_type', sa.Enum('custody', 'access', 'support', 'property', 'divorce', 'separation', 'adoption', 'child_protection', 'other', name='casetype'), nullable=False),
        sa.Column('court_location', sa.String(length=255), nullable=False),
        sa.Column('opposing_party', sa.String(length=255), nullable=False),
        sa.Column('status', sa.Enum('active', 'closed', 'on_hold', name='casestatus'), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("court_file_number ~ '^FS-[0-9]{2}-[0-9]{5}-[0-9]{4}$'", name='court_file_number_format'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('court_file_number')
    )
    op.create_index(op.f('ix_cases_case_type'), 'cases', ['case_type'], unique=False)
    op.create_index(op.f('ix_cases_id'), 'cases', ['id'], unique=False)
    op.create_index(op.f('ix_cases_status'), 'cases', ['status'], unique=False)
    op.create_index(op.f('ix_cases_title'), 'cases', ['title'], unique=False)
    op.create_index(op.f('ix_cases_user_id'), 'cases', ['user_id'], unique=False)
    op.create_index('ix_cases_user_status', 'cases', ['user_id', 'status'], unique=False)
    op.create_index('ix_cases_user_type', 'cases', ['user_id', 'case_type'], unique=False)

    # Create case_profiles table
    op.create_table('case_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('case_history', sa.Text(), nullable=True),
        sa.Column('key_issues', sa.Text(), nullable=True),
        sa.Column('opposing_counsel', sa.JSON(), nullable=True),
        sa.Column('case_strategy', sa.Text(), nullable=True),
        sa.Column('important_dates', sa.JSON(), nullable=True),
        sa.Column('settlement_discussions', sa.Text(), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('case_id')
    )
    op.create_index(op.f('ix_case_profiles_id'), 'case_profiles', ['id'], unique=False)

    # Create court_events table
    op.create_table('court_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('case_conference', 'settlement_conference', 'trial_management_conference', 'regular_motion', 'urgent_motion', 'emergency_motion', 'trial', 'summary_judgment_motion', 'show_cause_hearing', 'enforcement_hearing', 'status_review', 'uncontested_hearing', 'first_appearance', 'scheduling_conference', name='eventtype'), nullable=False),
        sa.Column('event_category', sa.Enum('conference', 'motion', 'trial', 'hearing', 'administrative', name='eventcategory'), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('scheduled_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('courtroom', sa.String(length=100), nullable=True),
        sa.Column('judge', sa.String(length=255), nullable=True),
        sa.Column('status', sa.Enum('scheduled', 'completed', 'adjourned', 'cancelled', 'rescheduled', name='eventstatus'), nullable=True),
        sa.Column('outcome', sa.Text(), nullable=True),
        sa.Column('event_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_court_events_case_id'), 'court_events', ['case_id'], unique=False)
    op.create_index(op.f('ix_court_events_event_category'), 'court_events', ['event_category'], unique=False)
    op.create_index(op.f('ix_court_events_event_type'), 'court_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_court_events_id'), 'court_events', ['id'], unique=False)
    op.create_index(op.f('ix_court_events_scheduled_date'), 'court_events', ['scheduled_date'], unique=False)
    op.create_index(op.f('ix_court_events_status'), 'court_events', ['status'], unique=False)
    op.create_index('ix_court_events_case_date', 'court_events', ['case_id', 'scheduled_date'], unique=False)
    op.create_index('ix_court_events_case_status', 'court_events', ['case_id', 'status'], unique=False)
    op.create_index('ix_court_events_type_status', 'court_events', ['event_type', 'status'], unique=False)

    # Create document_smart_text table first (referenced by case_documents)
    op.create_table('document_smart_text',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('tiptap_content', sa.JSON(), nullable=False),
        sa.Column('plain_text', sa.Text(), nullable=False),
        sa.Column('extraction_method', sa.String(length=50), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_smart_text_id'), 'document_smart_text', ['id'], unique=False)
    op.create_index('ix_document_smart_text_method', 'document_smart_text', ['extraction_method'], unique=False)
    # Note: GIN index for full-text search will be added after case_documents table is created

    # Create case_documents table
    op.create_table('case_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('stored_filename', sa.String(length=500), nullable=False),
        sa.Column('party_type', sa.Enum('court', 'respondent', 'applicant', name='partytype'), nullable=False),
        sa.Column('document_type', sa.Enum('affidavit', 'financial_statement', 'correspondence', 'court_order', 'notice_of_motion', 'case_conference_brief', 'settlement_conference_brief', 'trial_record', 'evidence', 'other', name='documenttype'), nullable=False),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('document_date', sa.Date(), nullable=False),
        sa.Column('smart_text_id', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['event_id'], ['court_events.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['smart_text_id'], ['document_smart_text.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_documents_case_id'), 'case_documents', ['case_id'], unique=False)
    op.create_index(op.f('ix_case_documents_document_date'), 'case_documents', ['document_date'], unique=False)
    op.create_index(op.f('ix_case_documents_document_type'), 'case_documents', ['document_type'], unique=False)
    op.create_index(op.f('ix_case_documents_event_id'), 'case_documents', ['event_id'], unique=False)
    op.create_index(op.f('ix_case_documents_id'), 'case_documents', ['id'], unique=False)
    op.create_index(op.f('ix_case_documents_party_type'), 'case_documents', ['party_type'], unique=False)
    op.create_index('ix_case_documents_case_party', 'case_documents', ['case_id', 'party_type'], unique=False)
    op.create_index('ix_case_documents_case_type', 'case_documents', ['case_id', 'document_type'], unique=False)
    op.create_index('ix_case_documents_case_date', 'case_documents', ['case_id', 'document_date'], unique=False)

    # Now add the foreign key constraint to document_smart_text
    op.create_foreign_key('fk_document_smart_text_document_id', 'document_smart_text', 'case_documents', ['document_id'], ['id'], ondelete='CASCADE')
    op.create_unique_constraint('uq_document_smart_text_document_id', 'document_smart_text', ['document_id'])

    # Create document_service table
    op.create_table('document_service',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('service_type', sa.Enum('personal', 'mail', 'email', 'courier', 'substituted', 'deemed', name='servicetype'), nullable=False),
        sa.Column('service_date', sa.Date(), nullable=False),
        sa.Column('served_on', sa.String(length=255), nullable=False),
        sa.Column('service_address', sa.JSON(), nullable=True),
        sa.Column('received_date', sa.Date(), nullable=True),
        sa.Column('receipt_method', sa.String(length=255), nullable=True),
        sa.Column('service_status', sa.Enum('pending', 'served', 'acknowledged', 'disputed', 'failed', name='servicestatus'), nullable=True),
        sa.Column('service_notes', sa.Text(), nullable=True),
        sa.Column('attempts', sa.JSON(), nullable=True),
        sa.Column('affidavit_of_service_id', sa.Integer(), nullable=True),
        sa.Column('days_for_response', sa.Integer(), nullable=True),
        sa.Column('response_deadline', sa.Date(), nullable=True),
        sa.Column('is_urgent', sa.Boolean(), nullable=True),
        sa.Column('court_ordered_service', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint('received_date IS NULL OR received_date >= service_date', name='received_after_served'),
        sa.CheckConstraint('response_deadline IS NULL OR response_deadline >= service_date', name='deadline_after_served'),
        sa.ForeignKeyConstraint(['document_id'], ['case_documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_service_document_id'), 'document_service', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_service_id'), 'document_service', ['id'], unique=False)
    op.create_index(op.f('ix_document_service_response_deadline'), 'document_service', ['response_deadline'], unique=False)
    op.create_index(op.f('ix_document_service_service_date'), 'document_service', ['service_date'], unique=False)
    op.create_index(op.f('ix_document_service_service_status'), 'document_service', ['service_status'], unique=False)
    op.create_index(op.f('ix_document_service_service_type'), 'document_service', ['service_type'], unique=False)
    op.create_index('ix_document_service_status_deadline', 'document_service', ['service_status', 'response_deadline'], unique=False)
    op.create_index('ix_document_service_document_status', 'document_service', ['document_id', 'service_status'], unique=False)

    # Create case_notes table
    op.create_table('case_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('note_type', sa.Enum('general', 'strategy', 'event', 'document', 'service', 'settlement', name='notetype'), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('tiptap_content', sa.JSON(), nullable=True),
        sa.Column('priority', sa.Enum('low', 'normal', 'high', 'urgent', name='notepriority'), nullable=True),
        sa.Column('is_confidential', sa.Boolean(), nullable=True),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('document_id', sa.Integer(), nullable=True),
        sa.Column('service_id', sa.Integer(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('reminder_date', sa.Date(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['document_id'], ['case_documents.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['event_id'], ['court_events.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['service_id'], ['document_service.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_case_notes_case_id'), 'case_notes', ['case_id'], unique=False)
    op.create_index(op.f('ix_case_notes_document_id'), 'case_notes', ['document_id'], unique=False)
    op.create_index(op.f('ix_case_notes_event_id'), 'case_notes', ['event_id'], unique=False)
    op.create_index(op.f('ix_case_notes_id'), 'case_notes', ['id'], unique=False)
    op.create_index(op.f('ix_case_notes_is_completed'), 'case_notes', ['is_completed'], unique=False)
    op.create_index(op.f('ix_case_notes_note_type'), 'case_notes', ['note_type'], unique=False)
    op.create_index(op.f('ix_case_notes_priority'), 'case_notes', ['priority'], unique=False)
    op.create_index(op.f('ix_case_notes_reminder_date'), 'case_notes', ['reminder_date'], unique=False)
    op.create_index(op.f('ix_case_notes_service_id'), 'case_notes', ['service_id'], unique=False)
    op.create_index('ix_case_notes_case_type', 'case_notes', ['case_id', 'note_type'], unique=False)
    op.create_index('ix_case_notes_case_priority', 'case_notes', ['case_id', 'priority'], unique=False)
    op.create_index('ix_case_notes_reminder', 'case_notes', ['reminder_date'], unique=False)

    # Add GIN index for full-text search on smart text (PostgreSQL specific)
    # Note: Using regular CREATE INDEX instead of CONCURRENTLY for migration
    op.execute("CREATE INDEX ix_document_smart_text_search ON document_smart_text USING gin(to_tsvector('english', plain_text))")


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_document_smart_text_search', 'document_smart_text')
    op.drop_index('ix_case_notes_reminder', 'case_notes')
    op.drop_index('ix_case_notes_case_priority', 'case_notes')
    op.drop_index('ix_case_notes_case_type', 'case_notes')
    op.drop_index(op.f('ix_case_notes_service_id'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_reminder_date'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_priority'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_note_type'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_is_completed'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_id'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_event_id'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_document_id'), 'case_notes')
    op.drop_index(op.f('ix_case_notes_case_id'), 'case_notes')
    op.drop_index('ix_document_service_document_status', 'document_service')
    op.drop_index('ix_document_service_status_deadline', 'document_service')
    op.drop_index(op.f('ix_document_service_service_type'), 'document_service')
    op.drop_index(op.f('ix_document_service_service_status'), 'document_service')
    op.drop_index(op.f('ix_document_service_service_date'), 'document_service')
    op.drop_index(op.f('ix_document_service_response_deadline'), 'document_service')
    op.drop_index(op.f('ix_document_service_id'), 'document_service')
    op.drop_index(op.f('ix_document_service_document_id'), 'document_service')
    op.drop_index('ix_case_documents_case_date', 'case_documents')
    op.drop_index('ix_case_documents_case_type', 'case_documents')
    op.drop_index('ix_case_documents_case_party', 'case_documents')
    op.drop_index(op.f('ix_case_documents_party_type'), 'case_documents')
    op.drop_index(op.f('ix_case_documents_id'), 'case_documents')
    op.drop_index(op.f('ix_case_documents_event_id'), 'case_documents')
    op.drop_index(op.f('ix_case_documents_document_type'), 'case_documents')
    op.drop_index(op.f('ix_case_documents_document_date'), 'case_documents')
    op.drop_index(op.f('ix_case_documents_case_id'), 'case_documents')
    op.drop_index('ix_document_smart_text_method', 'document_smart_text')
    op.drop_index(op.f('ix_document_smart_text_id'), 'document_smart_text')
    op.drop_index('ix_court_events_type_status', 'court_events')
    op.drop_index('ix_court_events_case_status', 'court_events')
    op.drop_index('ix_court_events_case_date', 'court_events')
    op.drop_index(op.f('ix_court_events_status'), 'court_events')
    op.drop_index(op.f('ix_court_events_scheduled_date'), 'court_events')
    op.drop_index(op.f('ix_court_events_id'), 'court_events')
    op.drop_index(op.f('ix_court_events_event_type'), 'court_events')
    op.drop_index(op.f('ix_court_events_event_category'), 'court_events')
    op.drop_index(op.f('ix_court_events_case_id'), 'court_events')
    op.drop_index(op.f('ix_case_profiles_id'), 'case_profiles')
    op.drop_index('ix_cases_user_type', 'cases')
    op.drop_index('ix_cases_user_status', 'cases')
    op.drop_index(op.f('ix_cases_user_id'), 'cases')
    op.drop_index(op.f('ix_cases_title'), 'cases')
    op.drop_index(op.f('ix_cases_status'), 'cases')
    op.drop_index(op.f('ix_cases_id'), 'cases')
    op.drop_index(op.f('ix_cases_case_type'), 'cases')

    # Drop tables
    op.drop_table('case_notes')
    op.drop_table('document_service')
    op.drop_table('case_documents')
    op.drop_table('document_smart_text')
    op.drop_table('court_events')
    op.drop_table('case_profiles')
    op.drop_table('cases')

    # Drop enums
    op.execute("DROP TYPE IF EXISTS notepriority")
    op.execute("DROP TYPE IF EXISTS notetype")
    op.execute("DROP TYPE IF EXISTS servicestatus")
    op.execute("DROP TYPE IF EXISTS servicetype")
    op.execute("DROP TYPE IF EXISTS documenttype")
    op.execute("DROP TYPE IF EXISTS partytype")
    op.execute("DROP TYPE IF EXISTS eventstatus")
    op.execute("DROP TYPE IF EXISTS eventcategory")
    op.execute("DROP TYPE IF EXISTS eventtype")
    op.execute("DROP TYPE IF EXISTS casestatus")
    op.execute("DROP TYPE IF EXISTS casetype")