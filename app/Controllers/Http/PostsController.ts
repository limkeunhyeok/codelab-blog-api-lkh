import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post';
import User from 'App/Models/User';
import { DateTime } from 'luxon';
import uid from 'tiny-uid';

function createSlug(subject) {
    let slug = subject.trim().replace(/\s/gi, '-')
    if (slug.length > 27) slug = slug.substr(0, 28);
    slug = encodeURIComponent(slug)
    slug = slug += `-${uid()}`;
    return slug;
}

export default class PostsController {
    async list({ request } : HttpContextContract) {
        const { displayName, page, perPage } = request.qs();
        // 1. display 없는 전체 목록 요청
        // 2. display 기준으로 필터링
        
        let query = Post.query()
            .preload('user')
            .where('publish_at', '<=', DateTime.now().toISO())
            .orderBy('publish_at', 'desc');


        if (displayName) {
            const user = await User.findByOrFail('display_name', displayName);
            query = query.where('user_id', user.id);
        }
        const posts = await query.paginate(page || 1, perPage || 12);
        return posts;
    }

    async create({ auth, request } : HttpContextContract) {
        const subject = request.input('subject')
        const content = request.input('content')
        const userId = auth.user?.id;
        const publishAt = request.input('publishAt', DateTime.now().toISO())

        // slug
        // 만일 영어가 아닌 경우 encode시 바뀌면서 길어지기 때문에 주의해야됨
        const slug = createSlug(subject);
        
        const post = await Post.create({
            userId,
            subject,
            content,
            slug,
            publishAt
        })

        // slug는 서버단에서 자동 생성 -> request input 없음
        // publish_at 규칙 필요, 2021-07-12 또는 timestamp 등등...
        return post
    }

    async read({ params } : HttpContextContract) {
        const { slug } = params
        const post = await Post.query()
            .preload('user')
            .preload('comments')
            .where('publish_at', '<=', DateTime.now().toISO())
            .where('slug', slug)
            .firstOrFail()
        
        return post;
    }

    async update({bouncer, request, params} : HttpContextContract) {
        const { slug } = params;
        const post = await Post.findByOrFail('slug', slug);
        // await bouncer.authorize('editPost', post); // 권한 없으면 403 에러 던짐
        await bouncer.with('PostPolicy').authorize('update', post);

        const subject = request.input('subject');
        const content = request.input('content');
        const publishAt = request.input('publishAt');

        if (subject) {
            if (post.subject !== subject) {
                post.slug = createSlug(subject);
            }
            post.subject = subject;
        }
        if (content) post.content = content;
        if (publishAt) post.publishAt = publishAt;
        return await post.save();
    }

    async delete({bouncer, params} : HttpContextContract) {
        const { slug } = params;
        const post = await Post.findByOrFail('slug', slug);
        // await bouncer.authorize('deletePost', post); // 권한 없으면 403 에러 던짐
        await bouncer.with('PostPolicy').authorize('delete', post);

        await post.delete()
        return 'ok';
    } 
}
