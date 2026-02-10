# DefaultApi

All URIs are relative to *http://localhost:3000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**healthcheck**](#healthcheck) | **GET** /health | Health check route|

# **healthcheck**
> Healthcheck200Response healthcheck()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from 'sdk';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.healthcheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Healthcheck200Response**

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

