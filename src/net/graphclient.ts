import { Util } from "../utils/util";
import { RuntimeConfig } from "../configuration/pnplibconfig";
import { mergeHeaders, FetchOptions } from "./utils";
import { RequestClient } from "../request/requestclient";
// import { APIUrlException } from "../utils/exceptions";

export class GraphHttpClient implements RequestClient {

    private _impl: GraphHttpClientImpl;

    constructor() {

        this._impl = RuntimeConfig.graphFetchClientFactory();
    }

    public fetch(url: string, options: FetchOptions = {}): Promise<Response> {

        // TODO: we could process auth here
        // until we are doing things like establishing the auth just pass this to the SPFx client to do the heavy lifting
        return this.fetchRaw(url, options);
    }

    public fetchRaw(url: string, options: FetchOptions = {}): Promise<Response> {

        // here we need to normalize the headers
        const rawHeaders = new Headers();
        mergeHeaders(rawHeaders, options.headers);
        options = Util.extend(options, { headers: rawHeaders });

        const retry = (ctx: RetryContext): void => {

            this._impl.fetch(url, {}, options).then((response) => ctx.resolve(response)).catch((response) => {

                // Check if request was throttled - http status code 429
                // Check if request failed due to server unavailable - http status code 503
                if (response.status !== 429 && response.status !== 503) {
                    ctx.reject(response);
                }

                // grab our current delay
                const delay = ctx.delay;

                // Increment our counters.
                ctx.delay *= 2;
                ctx.attempts++;

                // If we have exceeded the retry count, reject.
                if (ctx.retryCount <= ctx.attempts) {
                    ctx.reject(response);
                }

                // Set our retry timeout for {delay} milliseconds.
                setTimeout(Util.getCtxCallback(this, retry, ctx), delay);
            });
        };

        return new Promise((resolve, reject) => {

            const retryContext: RetryContext = {
                attempts: 0,
                delay: 100,
                reject: reject,
                resolve: resolve,
                retryCount: 7,
            };

            retry.call(this, retryContext);
        });
    }

    public get(url: string, options: FetchOptions = {}): Promise<Response> {
        const opts = Util.extend(options, { method: "GET" });
        return this.fetch(url, opts);
    }

    public post(url: string, options: FetchOptions = {}): Promise<Response> {
        const opts = Util.extend(options, { method: "POST" });
        return this.fetch(url, opts);
    }

    public patch(url: string, options: FetchOptions = {}): Promise<Response> {
        const opts = Util.extend(options, { method: "PATCH" });
        return this.fetch(url, opts);
    }

    public delete(url: string, options: FetchOptions = {}): Promise<Response> {
        const opts = Util.extend(options, { method: "DELETE" });
        return this.fetch(url, opts);
    }
}

interface RetryContext {
    attempts: number;
    delay: number;
    reject: (reason?: any) => void;
    resolve: (value?: {} | PromiseLike<{}>) => void;
    retryCount: number;
}

export interface GraphHttpClientImpl {
    fetch(url: string, configuration: any, options: FetchOptions): Promise<Response>;
}
