import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBookingsTable1734960003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create booking_status_enum type
    await queryRunner.query(`
      CREATE TYPE "booking_status_enum" AS ENUM (
        'pending',
        'approved',
        'rejected',
        'cancelled',
        'completed'
      )
    `);

    // Create bookings table
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'client_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'barber_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'service_id',
            type: 'integer',
          },
          {
            name: 'date',
            type: 'varchar',
          },
          {
            name: 'time',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'booking_status_enum',
            default: "'pending'",
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notification_sent',
            type: 'boolean',
            default: false,
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

    // Create foreign key to users (client)
    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        name: 'FK_BOOKINGS_CLIENT',
        columnNames: ['client_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key to users (barber)
    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        name: 'FK_BOOKINGS_BARBER',
        columnNames: ['barber_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key to barber_services
    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        name: 'FK_BOOKINGS_SERVICE',
        columnNames: ['service_id'],
        referencedTableName: 'barber_services',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_CLIENT',
        columnNames: ['client_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_BARBER',
        columnNames: ['barber_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_SERVICE',
        columnNames: ['service_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_DATE_TIME',
        columnNames: ['date', 'time'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_STATUS',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_STATUS');
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_DATE_TIME');
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_SERVICE');
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_BARBER');
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_CLIENT');

    // Drop foreign keys
    await queryRunner.dropForeignKey('bookings', 'FK_BOOKINGS_SERVICE');
    await queryRunner.dropForeignKey('bookings', 'FK_BOOKINGS_BARBER');
    await queryRunner.dropForeignKey('bookings', 'FK_BOOKINGS_CLIENT');

    // Drop table
    await queryRunner.dropTable('bookings');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "booking_status_enum"`);
  }
}

