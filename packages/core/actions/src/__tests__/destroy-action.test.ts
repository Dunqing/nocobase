import { MockServer, mockServer } from './index';
import { registerActions } from '@nocobase/actions';

describe('destroy action', () => {
  let app: MockServer;
  let Post;
  let Comment;
  let Tag;
  let PostTag;
  let Profile;

  beforeEach(async () => {
    app = mockServer();
    registerActions(app);

    PostTag = app.collection({
      name: 'posts_tags',
      fields: [{ type: 'string', name: 'tagged_at' }],
    });

    Post = app.collection({
      name: 'posts',
      fields: [
        { type: 'string', name: 'title' },
        { type: 'hasMany', name: 'comments' },
        { type: 'hasOne', name: 'profile' },
        { type: 'belongsToMany', name: 'tags', through: 'posts_tags' },
        { type: 'string', name: 'status', defaultValue: 'draft' },
      ],
    });

    Profile = app.collection({
      name: 'profiles',
      fields: [
        { type: 'string', name: 'post_profile' },
        { type: 'belongsTo', name: 'post' },
      ],
    });

    Comment = app.collection({
      name: 'comments',
      fields: [
        { type: 'string', name: 'content' },
        { type: 'belongsTo', name: 'post' },
      ],
    });

    Tag = app.collection({
      name: 'tags',
      fields: [
        { type: 'string', name: 'name' },
        { type: 'belongsToMany', name: 'posts', through: 'posts_tags' },
      ],
    });

    await app.db.sync();
  });

  afterEach(async () => {
    await app.destroy();
  });

  test('destroy resource', async () => {
    const p1 = await Post.repository.create({
      values: {
        title: 'p1',
      },
    });

    const response = await app
      .agent()
      .resource('posts')
      .destroy({
        filterByTk: p1.get('id'),
      });

    expect(response.statusCode).toEqual(200);
    expect(await Post.repository.count()).toEqual(0);
  });

  test('destroy has many resource', async () => {
    const p1 = await Post.repository.create({
      values: {
        title: 'p1',
        comments: [
          {
            content: 'c1',
          },
        ],
      },
    });

    const c1 = await Comment.repository.findOne();

    const response = await app
      .agent()
      .resource('posts.comments', p1.get('id'))
      .destroy({
        filterByTk: c1.get('id'),
      });

    expect(await Comment.repository.count()).toEqual(0);
  });

  test('destroy belongs to many', async () => {
    const p1 = await Post.repository.create({
      values: {
        title: 'p1',
        tags: [
          {
            name: 't1',
            posts_tags: {
              tagged_at: '123',
            },
          },
        ],
      },
    });

    expect(await Tag.repository.count()).toEqual(1);

    const p1t1 = (await p1.getTags())[0];

    const response = await app
      .agent()
      .resource('posts.tags', p1t1.get('id'))
      .destroy({
        filterByTk: p1.get('id'),
      });

    expect(await Tag.repository.count()).toEqual(0);
  });

  test('destroy has one', async () => {
    const p1 = await Post.repository.create({
      values: {
        title: 'p1',
        profile: {
          post_profile: 'test',
        },
      },
    });

    const postProfile = await Profile.repository.findOne();

    const response = await app.agent().resource('posts.profile', p1.get('id')).destroy();

    expect(await Profile.repository.count()).toEqual(0);
  });
});
