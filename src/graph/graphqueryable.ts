import { Util } from "../utils/util";
import { Dictionary } from "../collections/collections";
import { GraphHttpClient } from "../net/graphclient";
import { FetchOptions } from "../net/utils";
import { ODataParser } from "../odata/core";
import { ODataQueryable } from "../odata/queryable";
import {
    RequestContext,
    PipelineMethods,
} from "../request/pipeline";

export interface GraphQueryableConstructor<T> {
    new(baseUrl: string | GraphQueryable, path?: string): T;
}

/**
 * Queryable Base Class
 *
 */
export class GraphQueryable extends ODataQueryable {

    /**
     * Creates a new instance of the Queryable class
     *
     * @constructor
     * @param baseUrl A string or Queryable that should form the base part of the url
     *
     */
    constructor(baseUrl: string | GraphQueryable, path?: string) {
        super();

        this._query = new Dictionary<string>();

        if (typeof baseUrl === "string") {

            const urlStr = baseUrl as string;
            this._parentUrl = urlStr;
            this._url = Util.combinePaths(urlStr, path);
        } else {

            const q = baseUrl as GraphQueryable;
            this._parentUrl = q._url;
            this._url = Util.combinePaths(this._parentUrl, path);
        }
    }

    /**
     * Creates a new instance of the supplied factory and extends this into that new instance
     *
     * @param factory constructor for the new queryable
     */
    public as<T>(factory: GraphQueryableConstructor<T>): T {
        const o = <T>new factory(this._url, null);
        return Util.extend(o, this, true);
    }

    /**
     * Gets the full url with query information
     *
     */
    public toUrlAndQuery(): string {

        return this.toUrl() + `?${this._query.getKeys().map(key => `${key}=${this._query.get(key)}`).join("&")}`;
    }

    /**
     * Gets a parent for this instance as specified
     *
     * @param factory The contructor for the class to create
     */
    protected getParent<T extends GraphQueryable>(
        factory: GraphQueryableConstructor<T>,
        baseUrl: string | GraphQueryable = this.parentUrl,
        path?: string): T {

        return new factory(baseUrl, path);
    }

    /**
     * Clones this queryable into a new queryable instance of T
     * @param factory Constructor used to create the new instance
     * @param additionalPath Any additional path to include in the clone
     * @param includeBatch If true this instance's batch will be added to the cloned instance
     */
    protected clone<T extends GraphQueryable>(factory: GraphQueryableConstructor<T>, additionalPath?: string, includeBatch = true): T {

        // TODO:: include batching info in clone
        if (includeBatch) {
            return new factory(this, additionalPath);
        }

        return new factory(this, additionalPath);
    }

    /**
     * Converts the current instance to a request context
     *
     * @param verb The request verb
     * @param options The set of supplied request options
     * @param parser The supplied ODataParser instance
     * @param pipeline Optional request processing pipeline
     */
    protected toRequestContext<T>(
        verb: string,
        options: FetchOptions = {},
        parser: ODataParser<T>,
        pipeline: Array<(c: RequestContext<T>) => Promise<RequestContext<T>>> = PipelineMethods.default): Promise<RequestContext<T>> {

        // TODO:: add batch support
        return Promise.resolve({
            batch: null,
            batchDependency: () => void (0),
            cachingOptions: this._cachingOptions,
            clientFactory: () => new GraphHttpClient(),
            isBatched: false,
            isCached: this._useCaching,
            options: options,
            parser: parser,
            pipeline: pipeline,
            requestAbsoluteUrl: this.toUrlAndQuery(),
            requestId: Util.getGUID(),
            verb: verb,
        });
    }
}

/**
 * Represents a REST collection which can be filtered, paged, and selected
 *
 */
export class GraphQueryableCollection extends GraphQueryable {

    /**
     *
     * @param filter The string representing the filter query
     */
    public filter(filter: string): this {
        this._query.add("$filter", filter);
        return this;
    }

    /**
     * Choose which fields to return
     *
     * @param selects One or more fields to return
     */
    public select(...selects: string[]): this {
        if (selects.length > 0) {
            this._query.add("$select", selects.join(","));
        }
        return this;
    }

    /**
     * Expands fields such as lookups to get additional data
     *
     * @param expands The Fields for which to expand the values
     */
    public expand(...expands: string[]): this {
        if (expands.length > 0) {
            this._query.add("$expand", expands.join(","));
        }
        return this;
    }

    /**
     * Orders based on the supplied fields ascending
     *
     * @param orderby The name of the field to sort on
     * @param ascending If false DESC is appended, otherwise ASC (default)
     */
    public orderBy(orderBy: string, ascending = true): this {
        const keys = this._query.getKeys();
        const query: string[] = [];
        const asc = ascending ? " asc" : " desc";
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] === "$orderby") {
                query.push(this._query.get("$orderby"));
                break;
            }
        }
        query.push(`${orderBy}${asc}`);

        this._query.add("$orderby", query.join(","));

        return this;
    }

    /**
     * Limits the query to only return the specified number of items
     *
     * @param top The query row limit
     */
    public top(top: number): this {
        this._query.add("$top", top.toString());
        return this;
    }

    /**
     * Skips a set number of items in the return set
     *
     * @param num Number of items to skip
     */
    public skip(num: number): this {
        this._query.add("$top", num.toString());
        return this;
    }

    /**
     * 	To request second and subsequent pages of Graph data
     */
    public skipToken(token: string): this {
        this._query.add("$skiptoken", token);
        return this;
    }

    /**
     * 	Retrieves the total count of matching resources
     */
    public get count(): this {
        this._query.add("$count", "true");
        return this;
    }
}

export class GraphQueryableSearchableCollection extends GraphQueryableCollection {

    /**
     * 	To request second and subsequent pages of Graph data
     */
    public search(query: string): this {
        this._query.add("$search", query);
        return this;
    }
}

/**
 * Represents an instance that can be selected
 *
 */
export class GraphQueryableInstance extends GraphQueryable {

    /**
     * Choose which fields to return
     *
     * @param selects One or more fields to return
     */
    public select(...selects: string[]): this {
        if (selects.length > 0) {
            this._query.add("$select", selects.join(","));
        }
        return this;
    }

    /**
     * Expands fields such as lookups to get additional data
     *
     * @param expands The Fields for which to expand the values
     */
    public expand(...expands: string[]): this {
        if (expands.length > 0) {
            this._query.add("$expand", expands.join(","));
        }
        return this;
    }
}
