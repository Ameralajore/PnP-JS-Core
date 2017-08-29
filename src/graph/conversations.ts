import { GraphQueryable, GraphQueryableInstance, GraphQueryableCollection } from "./graphqueryable";
import { TypedHash } from "../collections/collections";
import { Attachments } from "./attachments";

import { ConversationThread as IConversationThread, Post as IPost, Recipient as IRecipient } from "@microsoft/microsoft-graph-types";

/**
 * Information used to forward a post
 */
export interface PostForwardInfo {
    comment?: string;
    toRecipients: IRecipient[];
}

export class Conversations extends GraphQueryableCollection {

    constructor(baseUrl: string | GraphQueryable, path = "conversations") {
        super(baseUrl, path);
    }

    /**
     * Create a new conversation by including a thread and a post.
     * 
     * @param properties Properties used to create the new conversation
     */
    public add(properties: TypedHash<any>): Promise<any> {

        return this.postCore({
            body: JSON.stringify(properties),
        });
    }

    /**
     * Gets a conversation from this collection by id
     * 
     * @param id Group member's id
     */
    public getById(id: string): Conversation {
        return new Conversation(this, id);
    }
}

export class Threads extends GraphQueryableCollection {

    constructor(baseUrl: string | GraphQueryable, path = "threads") {
        super(baseUrl, path);
    }

    /**
     * Gets a thread from this collection by id
     * 
     * @param id Group member's id
     */
    public getById(id: string): Thread {
        return new Thread(this, id);
    }

    /**
     * Adds a new thread to this collection
     * 
     * @param properties properties used to create the new thread
     * @returns Id of the new thread
     */
    public add(properties: IConversationThread): Promise<{ id: string }> {

        return this.postCore({
            body: JSON.stringify(properties),
        });
    }
}

export class Posts extends GraphQueryableCollection {

    constructor(baseUrl: string | GraphQueryable, path = "posts") {
        super(baseUrl, path);
    }

    /**
     * Gets a thread from this collection by id
     * 
     * @param id Group member's id
     */
    public getById(id: string): Post {
        return new Post(this, id);
    }

    /**
     * Adds a new thread to this collection
     * 
     * @param properties properties used to create the new thread
     * @returns Id of the new thread
     */
    public add(properties: IPost): Promise<{ id: string }> {

        return this.postCore({
            body: JSON.stringify(properties),
        });
    }
}

export class Conversation extends GraphQueryableInstance {

    /**
     * Get all the threads in a group conversation.
     */
    public get threads(): Threads {
        return new Threads(this);
    }

    /**
     * Updates this conversation
     */
    public update(properties: TypedHash<any>): Promise<void> {

        return this.patchCore({
            body: JSON.stringify(properties),
        });
    }

    /**
     * Deletes this member from the group
     */
    public delete(): Promise<void> {
        return this.deleteCore();
    }
}

export class Thread extends GraphQueryableInstance {

    /**
     * Get all the threads in a group conversation.
     */
    public get posts(): Posts {
        return new Posts(this);
    }

    /**
     * Reply to a thread in a group conversation and add a new post to it
     * 
     * @param post Contents of the post 
     */
    public reply(post: IPost): Promise<void> {

        return this.clone(Thread, "reply").postCore({
            body: JSON.stringify({
                post: post,
            }),
        });
    }

    /**
     * Deletes this member from the group
     */
    public delete(): Promise<void> {
        return this.deleteCore();
    }
}

export class Post extends GraphQueryableInstance {

    public get attachments(): Attachments {
        return new Attachments(this);
    }

    /**
     * Deletes this post
     */
    public delete(): Promise<void> {
        return this.deleteCore();
    }

    /**
     * Forward a post to a recipient
     */
    public forward(info: PostForwardInfo): Promise<void> {
        return this.clone(Post, "forward").postCore({
            body: JSON.stringify(info),
        });
    }

    /**
     * Reply to a thread in a group conversation and add a new post to it
     * 
     * @param post Contents of the post 
     */
    public reply(post: IPost): Promise<void> {

        return this.clone(Post, "reply").postCore({
            body: JSON.stringify({
                post: post,
            }),
        });
    }
}

export class Senders extends GraphQueryableCollection {

    constructor(baseUrl: string | GraphQueryable, path?: string) {
        super(baseUrl, path);
    }

    /**
     * Add a new user or group to this senders collection
     * @param id The full @odata.id value to add (ex: https://graph.microsoft.com/v1.0/users/user@contoso.com)
     */
    public add(id: string): Promise<any> {

        return this.clone(Senders, "$ref").postCore({
            body: JSON.stringify({
                "@odata.id": id,
            }),
        });
    }

    /**
     * Removes the entity from the collection
     * 
     * @param id The full @odata.id value to remove (ex: https://graph.microsoft.com/v1.0/users/user@contoso.com)
     */
    public remove(id: string): Promise<void> {

        const remover = this.clone(Senders, "$ref");
        remover.query.add("$id", id);
        return remover.deleteCore();
    }
}
