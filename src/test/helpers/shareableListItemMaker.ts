import { ShareableListItem } from '../../database/types';
import { faker } from '@faker-js/faker';

export const shareableListItemMaker = (url: string): ShareableListItem => {
  return {
    externalId: faker.string.uuid(),
    itemId: faker.number.bigInt(),
    url: url,
    title: faker.lorem.words(5),
    excerpt: faker.lorem.sentences(2),
    note: faker.lorem.sentences(2),
    imageUrl: faker.image.urlLoremFlickr({ category: 'cats' }),
    publisher: faker.company.name(),
    authors: faker.person.firstName(),
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
