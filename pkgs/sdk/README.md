## sdk@0.0.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install sdk@0.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *http://localhost:3000*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*DefaultApi* | [**healthcheck**](docs/DefaultApi.md#healthcheck) | **GET** /health | Health check route
*ListingsApi* | [**createListing**](docs/ListingsApi.md#createlisting) | **POST** /listings | Create a new listing (demand or supply)
*ListingsApi* | [**createListingResponse**](docs/ListingsApi.md#createlistingresponse) | **POST** /listings/{id}/responses | Add a response (farmer offer) to an existing demand listing
*ListingsApi* | [**getListing**](docs/ListingsApi.md#getlisting) | **GET** /listings/{id} | Get a single listing with its embedded responses
*ListingsApi* | [**listListings**](docs/ListingsApi.md#listlistings) | **GET** /listings | List all listings. Optional ?type&#x3D;demand|supply filter. Returns creator info populated.
*UsersApi* | [**getCurrentUser**](docs/UsersApi.md#getcurrentuser) | **GET** /users/me | Return the authenticated user\&#39;s profile
*UsersApi* | [**listUsers**](docs/UsersApi.md#listusers) | **GET** /users | List registered users (Auth0 IDs omitted)
*UsersApi* | [**registerUser**](docs/UsersApi.md#registeruser) | **POST** /users/register | Complete Auth0 registration by assigning a role


### Documentation For Models

 - [CreateListing201Response](docs/CreateListing201Response.md)
 - [CreateListing201ResponseResponsesInner](docs/CreateListing201ResponseResponsesInner.md)
 - [CreateListingRequest](docs/CreateListingRequest.md)
 - [CreateListingResponseRequest](docs/CreateListingResponseRequest.md)
 - [Healthcheck200Response](docs/Healthcheck200Response.md)
 - [ListListings200ResponseInner](docs/ListListings200ResponseInner.md)
 - [ListListings200ResponseInnerCreatedBy](docs/ListListings200ResponseInnerCreatedBy.md)
 - [ListListings200ResponseInnerResponsesInner](docs/ListListings200ResponseInnerResponsesInner.md)
 - [ListListings200ResponseInnerResponsesInnerCreatedBy](docs/ListListings200ResponseInnerResponsesInnerCreatedBy.md)
 - [ListUsers200ResponseInner](docs/ListUsers200ResponseInner.md)
 - [RegisterUser201Response](docs/RegisterUser201Response.md)
 - [RegisterUserRequest](docs/RegisterUserRequest.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="bearerAuth"></a>
### bearerAuth

- **Type**: Bearer authentication (JWT)

