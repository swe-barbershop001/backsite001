import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateServiceCategoriesTable1734960001000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'service_categories',
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
            isUnique: true,
          },
          {
            name: 'icon',
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

    // Create unique index on name
    await queryRunner.createIndex(
      'service_categories',
      new TableIndex({
        name: 'IDX_SERVICE_CATEGORIES_NAME',
        columnNames: ['name'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('service_categories', 'IDX_SERVICE_CATEGORIES_NAME');

    // Drop table
    await queryRunner.dropTable('service_categories');
  }
}

