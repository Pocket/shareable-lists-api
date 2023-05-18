import { ShareableListItem } from '../../database/types';
import { faker } from '@faker-js/faker';

export const shareableListItemMaker = (itemId: string): ShareableListItem => {
  return {
    externalId: faker.datatype.uuid(),
    itemId: parseInt(itemId) as unknown as bigint,
    url: `${faker.internet.url()}/${faker.lorem.slug(5)}`,
    title: faker.random.words(5),
    excerpt: faker.lorem.sentences(2),
    note: faker.lorem.sentences(2),
    imageUrl: faker.image.cats(),
    publisher: faker.company.name(),
    authors: faker.name.fullName(),
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
