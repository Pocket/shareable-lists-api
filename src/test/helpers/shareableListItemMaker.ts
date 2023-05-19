import { ShareableListItem } from '../../database/types';
import { faker } from '@faker-js/faker';

export const shareableListItemMaker = (itemId: string): ShareableListItem => {
  return {
    externalId: faker.string.uuid(),
    itemId: parseInt(itemId) as unknown as bigint,
    url: `${faker.internet.url()}/${faker.lorem.slug(5)}`,
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
