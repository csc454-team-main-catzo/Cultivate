import { ResponseContext, RequestContext, HttpFile, HttpInfo } from '../http/http';
import { Configuration, ConfigurationOptions } from '../configuration'
import type { Middleware } from '../middleware';


import { ObservableDefaultApi } from "./ObservableAPI";
import { DefaultApiRequestFactory, DefaultApiResponseProcessor} from "../apis/DefaultApi";

export interface DefaultApiGetIndexRequest {
}

export interface DefaultApiGetUsersRequest {
}

export interface DefaultApiPostUsersRequest {
}

export class ObjectDefaultApi {
    private api: ObservableDefaultApi

    public constructor(configuration: Configuration, requestFactory?: DefaultApiRequestFactory, responseProcessor?: DefaultApiResponseProcessor) {
        this.api = new ObservableDefaultApi(configuration, requestFactory, responseProcessor);
    }

    /**
     * @param param the request object
     */
    public getIndexWithHttpInfo(param: DefaultApiGetIndexRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<void>> {
        return this.api.getIndexWithHttpInfo( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public getIndex(param: DefaultApiGetIndexRequest = {}, options?: ConfigurationOptions): Promise<void> {
        return this.api.getIndex( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public getUsersWithHttpInfo(param: DefaultApiGetUsersRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<void>> {
        return this.api.getUsersWithHttpInfo( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public getUsers(param: DefaultApiGetUsersRequest = {}, options?: ConfigurationOptions): Promise<void> {
        return this.api.getUsers( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public postUsersWithHttpInfo(param: DefaultApiPostUsersRequest = {}, options?: ConfigurationOptions): Promise<HttpInfo<void>> {
        return this.api.postUsersWithHttpInfo( options).toPromise();
    }

    /**
     * @param param the request object
     */
    public postUsers(param: DefaultApiPostUsersRequest = {}, options?: ConfigurationOptions): Promise<void> {
        return this.api.postUsers( options).toPromise();
    }

}
