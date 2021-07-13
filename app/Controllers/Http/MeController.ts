import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post';
import User from 'App/Models/User';

export default class UsController {
    async getProfile({ auth } : HttpContextContract) {
        return auth.user;
    }

    async updateProfile({ auth, request, response } : HttpContextContract) {
        const displayName = request.input('displayName')
        const name = request.input('name')
        const avatar = request.input('avatar')

        if (displayName && displayName !== auth.user?.displayName) {
            const exist = await User.findBy('displayName', displayName);
            if (exist) {
                response.status(409)
                return { message: '이미 사용중인 displayName 입니다.' }
            }
        }

        const params = {
            displayName,
            name,
            avatar,
        };

        auth.user?.merge( params );
        await auth.user?.save();
        return auth.user;
    }

    async leave({ auth } : HttpContextContract) {
        await auth.user?.delete();
        return 'ok'
    }

    async getPosts({ auth, request } : HttpContextContract) {
        const { page, perPage } = request.qs();
        return await Post.query().orderBy('publish_at', 'desc')
            .where('user_id', auth.user?.id)
            .paginate(page || 1, perPage || 12)
    }
    
    async getPost({ auth, params } : HttpContextContract) {
        const { slug } = params;
        return await Post.query().where('user_id', auth.user?.id)
            .where('slug', slug)
            .firstOrFail()
    }
}