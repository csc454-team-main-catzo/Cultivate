# ListingsApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createListing**](#createlisting) | **POST** /listings | Create a new listing (demand or supply)|
|[**createListingResponse**](#createlistingresponse) | **POST** /listings/{id}/responses | Add a response (farmer offer) to an existing demand listing|
|[**getListing**](#getlisting) | **GET** /listings/{id} | Get a single listing with its embedded responses|
|[**listListings**](#listlistings) | **GET** /listings | List all listings. Optional ?type&#x3D;demand|supply filter. Returns creator info populated.|

# **createListing**
> CreateListing201Response createListing()


### Example

```typescript
import {
    ListingsApi,
    Configuration,
    CreateListingRequest
} from 'sdk';

const configuration = new Configuration();
const apiInstance = new ListingsApi(configuration);

let createListingRequest: CreateListingRequest; // (optional)

const { status, data } = await apiInstance.createListing(
    createListingRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createListingRequest** | **CreateListingRequest**|  | |


### Return type

**CreateListing201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Listing created successfully |  -  |
|**400** | Validation error |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createListingResponse**
> CreateListing201Response createListingResponse()


### Example

```typescript
import {
    ListingsApi,
    Configuration,
    CreateListingResponseRequest
} from 'sdk';

const configuration = new Configuration();
const apiInstance = new ListingsApi(configuration);

let id: string; // (default to undefined)
let createListingResponseRequest: CreateListingResponseRequest; // (optional)

const { status, data } = await apiInstance.createListingResponse(
    id,
    createListingResponseRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createListingResponseRequest** | **CreateListingResponseRequest**|  | |
| **id** | [**string**] |  | defaults to undefined|


### Return type

**CreateListing201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Response added, returns updated listing |  -  |
|**400** | Validation error |  -  |
|**401** | Unauthorized |  -  |
|**404** | Listing not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getListing**
> CreateListing201Response getListing()


### Example

```typescript
import {
    ListingsApi,
    Configuration
} from 'sdk';

const configuration = new Configuration();
const apiInstance = new ListingsApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.getListing(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**CreateListing201Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Listing with embedded responses |  -  |
|**404** | Listing not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listListings**
> Array<ListListings200ResponseInner> listListings()


### Example

```typescript
import {
    ListingsApi,
    Configuration
} from 'sdk';

const configuration = new Configuration();
const apiInstance = new ListingsApi(configuration);

const { status, data } = await apiInstance.listListings();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ListListings200ResponseInner>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Array of listings |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

