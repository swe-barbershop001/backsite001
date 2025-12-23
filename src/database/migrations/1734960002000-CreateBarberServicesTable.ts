import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBarberServicesTable1734960002000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'barber_services',
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
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'duration',
            type: 'integer',
          },
          {
            name: 'image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'category_id',
            type: 'integer',
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

    // Create foreign key to service_categories
    await queryRunner.createForeignKey(
      'barber_services',
      new TableForeignKey({
        name: 'FK_BARBER_SERVICES_CATEGORY',
        columnNames: ['category_id'],
        referencedTableName: 'service_categories',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create index on category_id
    await queryRunner.createIndex(
      'barber_services',
      new TableIndex({
        name: 'IDX_BARBER_SERVICES_CATEGORY',
        columnNames: ['category_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('barber_services', 'IDX_BARBER_SERVICES_CATEGORY');

    // Drop foreign key
    await queryRunner.dropForeignKey('barber_services', 'FK_BARBER_SERVICES_CATEGORY');

    // Drop table
    await queryRunner.dropTable('barber_services');
  }
}

