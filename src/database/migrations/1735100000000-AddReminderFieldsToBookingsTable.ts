import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddReminderFieldsToBookingsTable1735100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reminder_1_day_sent column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'reminder_1_day_sent',
        type: 'boolean',
        default: false,
      }),
    );

    // Add reminder_3_hours_sent column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'reminder_3_hours_sent',
        type: 'boolean',
        default: false,
      }),
    );

    // Add reminder_1_hour_sent column
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'reminder_1_hour_sent',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns
    await queryRunner.dropColumn('bookings', 'reminder_1_hour_sent');
    await queryRunner.dropColumn('bookings', 'reminder_3_hours_sent');
    await queryRunner.dropColumn('bookings', 'reminder_1_day_sent');
  }
}
