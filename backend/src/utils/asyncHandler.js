const asyncHandler = (requestHandler) => {
    
    return (req, res, next) => { // Returns a middleware-like function
        Promise.resolve(requestHandler(req, res, next)) // Resolves the requestHandler
            .catch((err) => {
                next(err); // Forwards any errors to the Express error handler
            });
    };
};

export {asyncHandler}