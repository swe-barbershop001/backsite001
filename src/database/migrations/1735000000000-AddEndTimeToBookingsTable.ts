import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddEndTimeToBookingsTable1735000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add end_time column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'end_time',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add completion_notification_sent column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'completion_notification_sent',
        type: 'boolean',
        default: false,
      }),
    );

    // Create index for end_time (for cron job performance)
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_END_TIME',
        columnNames: ['end_time'],
      }),
    );

    // Create index for completion_notification_sent
    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_BOOKINGS_COMPLETION_NOTIFICATION',
        columnNames: ['completion_notification_sent'],
      }),
    );

    // Fill end_time for existing bookings
    // Calculate end_time from date, time, and service duration
    await queryRunner.query(`
      UPDATE bookings b
      SET end_time = (
        SELECT 
          (b.date || ' ' || b.time || ':00')::timestamp + 
          (bs.duration || ' minutes')::interval
        FROM barber_services bs
        WHERE bs.id = b.service_id
      )
      WHERE b.end_time IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_COMPLETION_NOTIFICATION');
    await queryRunner.dropIndex('bookings', 'IDX_BOOKINGS_END_TIME');

    // Drop columns
    await queryRunner.dropColumn('bookings', 'completion_notification_sent');
    await queryRunner.dropColumn('bookings', 'end_time');
  }
}
