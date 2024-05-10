import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/postgresql";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property()
  birthday: Date;

  constructor(birthday: Date) {
    this.birthday = birthday;
  }
}

let orm: MikroORM;
let postgresContainer: StartedPostgreSqlContainer;

beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer().start();

  const dbConfig = {
    dbName: postgresContainer.getDatabase(),
    user: postgresContainer.getUsername(),
    password: postgresContainer.getPassword(),
    host: postgresContainer.getHost(),
    port: postgresContainer.getMappedPort(5432),
  };

  orm = await MikroORM.init({
    ...dbConfig,
    entities: [User],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
  await postgresContainer.stop();
});

test("knex date conversion works as expected", async () => {
  orm.em.create(User, { birthday: new Date("1990-01-01") });
  await orm.em.flush();

  // When using knex directly the conversion from postgres date to javascript Date is skipped.
  // We get back a date string '1990-01-01 00:00:00+00'
  // This worked in 5.9.8
  const knex = orm.em.getKnex();
  const users = await knex("user").select("*");
  expect(users[0].birthday).toEqual(new Date("1990-01-01"));
});
