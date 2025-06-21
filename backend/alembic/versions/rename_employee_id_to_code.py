"""Rename employee_id to employee_code

Revision ID: rename_employee_id_to_code
Revises: c279853f7c0e
Create Date: 2025-06-21 17:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'rename_employee_id_to_code'
down_revision = 'c279853f7c0e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # employee_id を employee_code にリネーム
    op.alter_column('users', 'employee_id', new_column_name='employee_code')


def downgrade() -> None:
    # employee_code を employee_id に戻す
    op.alter_column('users', 'employee_code', new_column_name='employee_id')