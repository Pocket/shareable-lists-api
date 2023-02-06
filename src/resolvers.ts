import { faker } from '@faker-js/faker';
// dummy data -- this is temporary, remove when OSL-144: https://getpocket.atlassian.net/browse/OSL-144
// is done
let listData = [];
let singleList;
for (let i = 0; i < 5; i++) {
  singleList = {};
  singleList['author'] = faker.name.findName();
  singleList['id'] = faker.datatype.uuid();
  singleList['slug'] = faker.lorem.slug();
  singleList['title'] = faker.random.words(5);
  singleList['description'] = faker.lorem.sentences(2);
  singleList['status'] = 'PUBLIC';
  singleList['listItems'] = [
    {
      id: faker.datatype.uuid(),
      listId: faker.datatype.uuid(),
      itemId: i,
      title: faker.random.words(2),
      excerpt: faker.lorem.sentences(4),
    },
  ];
  listData.push(singleList);
}

function lists(): any {
  return listData;
}
// dummy resolver
export const resolvers = {
  Query: {
    lists,
  },
};
