[Home](./index) &gt; [@microsoft/rush-lib](rush-lib.md) &gt; [IndividualVersionPolicy](rush-lib.individualversionpolicy.md) &gt; [validate](rush-lib.individualversionpolicy.validate.md)

# IndividualVersionPolicy.validate method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.

Validates the specified version and throws if the version does not satisfy the policy.

**Signature:**
```javascript
public validate(versionString: string, packageName: string): void;
```
**Returns:** `void`

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  `versionString` | `string` | version string |
|  `packageName` | `string` | package name |
