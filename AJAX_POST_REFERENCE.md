# AJAX POST Migration - Quick Reference

## What Changed

### Before:
```javascript
await ajax_post(`/endpoint?param1=${value1}&param2=${value2}`, 1)
```

### After:
```javascript
await ajax_post("/endpoint", 1, { param1: value1, param2: value2 })
```

## Updated await ajax_post Function

```javascript
function await ajax_post( urlsor, tipus, data ) {
    var s = "";
    var ajaxConfig = {
        url: urlsor, 
        type: "post", 
        async: false, 
        cache: false, 
        dataType: tipus===0?'html':'json',
        beforeSend: function(xhr) { },
        success: function(response) { s = response; },
        error: function(jqXHR, textStatus, errorThrown) { },
        complete: function() { }
    };
    
    if (data) {
        ajaxConfig.contentType = 'application/json';
        ajaxConfig.data = JSON.stringify(data);
    }
    
    $.ajax(ajaxConfig);
    return s;
}
```

## Key Points

1. **Third Parameter**: Add an optional `data` object as the third parameter
2. **JSON Format**: Data is automatically serialized to JSON and sent in the POST body
3. **Empty Object**: Use `{}` for endpoints that don't require parameters
4. **No URL Encoding**: No need for `encodeURIComponent()` - handled automatically
5. **Backward Compatible**: Old calls without `data` parameter still work

## Example Conversions

### Simple Single Parameter
```javascript
// Before:
await ajax_post(`/isRegistered?email=${mail}`, 0)

// After:
await ajax_post("/isRegistered", 0, { email: mail })
```

### Multiple Parameters
```javascript
// Before:
await ajax_post(`/loginUser?user=${user}&passwd=${passwd}&userToken=&mail=${mail}`, 1)

// After:
await ajax_post("/loginUser", 1, { user: user, passwd: passwd, userToken: "", mail: mail })
```

### Complex Object
```javascript
// Before:
await ajax_post(`/SendFeladatok?${par}`, 1)

// After:
const temp = {
    tanarId: CurrentUserData.id,
    evfolyam: filter1,
    tantargy: filter2,
    // ... more properties
};
await ajax_post("/SendFeladatok", 1, temp)
```

### No Parameters
```javascript
// Before:
await ajax_post("/SendIntezmeny", 1)

// After:
await ajax_post("/SendIntezmeny", 1, {})
```

## Backend Notes
- All POST endpoints use `req.body`
- GET endpoints remain unchanged (still use `req.query`)

## Security Benefits
✅ Passwords and tokens no longer visible in URL
✅ Reduced risk of URL logging in proxy servers
✅ No browser history of sensitive parameters
✅ Complies with REST API best practices
