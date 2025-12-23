import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1734960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_role_enum type
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'admin',
        'barber',
        'client',
        'super_admin'
      )
    `);

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tg_id',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'tg_username',
            type: 'varchar',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'user_role_enum',
            default: "'client'",
          },
          {
            name: 'working',
            type: 'boolean',
            default: false,
            isNullable: true,
          },
          {
            name: 'work_start_time',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'work_end_time',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'profile_image',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_TG_ID',
        columnNames: ['tg_id'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_TG_USERNAME',
        columnNames: ['tg_username'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('users', 'IDX_USERS_TG_USERNAME');
    await queryRunner.dropIndex('users', 'IDX_USERS_TG_ID');

    // Drop table
    await queryRunner.dropTable('users');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}

