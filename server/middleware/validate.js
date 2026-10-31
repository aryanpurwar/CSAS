import { badRequest } from '../lib/http.js';

// Validates and replaces req.body / req.params / req.query with the parsed (typed,
// stripped-of-unknown-keys) result. Unknown fields never reach a controller.
export const validate = (schemas) => (req, _res, next) => {
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      return next(badRequest('Some fields are invalid', result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))));
    }
    if (key === 'query') Object.defineProperty(req, 'validatedQuery', { value: result.data });
    else req[key] = result.data;
  }
  next();
};
