import Queue from 'bull';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import ErrorHandler from '../utils/network/error';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    const userQueue = new Queue('userQueue');
    if (!email) return ErrorHandler.badRequest(res, 'Missing email');
    if (!password) return ErrorHandler.badRequest(res, 'Missing password');

    const user = await dbClient.users.findOne({ email });
    if (user) return ErrorHandler.badRequest(res, 'Already exist');

    const newUser = await dbClient.users.insertOne({
      email,
      password: sha1(password),
    });
    userQueue.add({ userId: newUser.ops[0]._id });
    return res.status(201).json({ id: newUser.ops[0]._id, email });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    const userID = await redisClient.get(`auth_${token}`);
    if (!userID) return ErrorHandler.unauthorized(res);
    const user = await dbClient.users.findOne({ _id: ObjectId(userID) });
    if (!user) return ErrorHandler.unauthorized(res);
    return res.json({ id: user._id, email: user.email });
  }
}

export default UsersController;
