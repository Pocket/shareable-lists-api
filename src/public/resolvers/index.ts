import { faker } from '@faker-js/faker';
import { getShareableList } from './queries/ShareableList';
import { createShareableList, deleteShareableList } from './mutations/ShareableList';

// dummy data -- this is temporary
const listData = [];
let singleList;
for (let i = 0; i < 5; i++) {
  singleList = {};
  singleList['externalId'] = faker.datatype.uuid();
  singleList['slug'] = faker.lorem.slug();
  singleList['title'] = faker.random.words(5);
  singleList['description'] = faker.lorem.sentences(2);
  singleList['status'] = 'PUBLIC';
  singleList['moderationStatus'] = 'VISIBLE';
  singleList['listItems'] = [
    {
      externalId: faker.datatype.uuid(),
      listId: i,
      url: faker.internet.url(),
      title: faker.random.words(2),
      excerpt: faker.lorem.sentences(4),
    },
  ];
  listData.push(singleList);
}

function lists(): any {
  return listData;
}

export const resolvers = {
  Mutation: { 
    createShareableList, 
    deleteShareableList
  },
  Query: {
    lists,
    shareableList: getShareableList,
  },
};
