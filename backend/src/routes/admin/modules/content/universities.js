const { Router } = require('express');
const { prisma } = require('../../../../db/prisma');
const {
    listQuerySchema,
    normalizeNullableString,
    toUniversityDto,
    universityCreateSchema,
    universityUpdateSchema,
} = require('../shared');

const universitiesAdminRouter = Router();

universitiesAdminRouter.get('/universities', async (req, res, next) => {
    try {
        const query = listQuerySchema.parse(req.query);
        const where = query.q
            ? {
                  OR: [
                      { name: { contains: query.q } },
                      { shortName: { contains: query.q } },
                      { city: { contains: query.q } },
                      { state: { contains: query.q } },
                      { code: { contains: query.q } },
                  ],
              }
            : {};

        const [items, total] = await Promise.all([
            prisma.university.findMany({
                where,
                orderBy: [{ featured: 'desc' }, { name: 'asc' }],
                take: query.limit,
                skip: query.offset,
                include: { _count: { select: { programs: true } } },
            }),
            prisma.university.count({ where }),
        ]);

        res.json({ items: items.map(toUniversityDto), total });
    } catch (error) {
        next(error);
    }
});

universitiesAdminRouter.post('/universities', async (req, res, next) => {
    try {
        const body = universityCreateSchema.parse(req.body ?? {});
        const created = await prisma.university.create({
            data: {
                code: String(body.code || '').trim().toUpperCase(),
                name: String(body.name || '').trim(),
                shortName: normalizeNullableString(body.shortName),
                city: normalizeNullableString(body.city),
                state: normalizeNullableString(body.state),
                country: normalizeNullableString(body.country),
                website: normalizeNullableString(body.website),
                overview: normalizeNullableString(body.overview),
                featured: body.featured ?? false,
            },
        });

        res.json({ success: true, item: toUniversityDto(created) });
    } catch (error) {
        next(error);
    }
});

universitiesAdminRouter.patch('/universities/:universityId', async (req, res, next) => {
    try {
        const body = universityUpdateSchema.parse(req.body ?? {});
        const data = {};

        if (Object.prototype.hasOwnProperty.call(body, 'code')) data.code = String(body.code || '').trim().toUpperCase();
        if (Object.prototype.hasOwnProperty.call(body, 'name')) data.name = String(body.name || '').trim();
        if (Object.prototype.hasOwnProperty.call(body, 'shortName')) data.shortName = normalizeNullableString(body.shortName);
        if (Object.prototype.hasOwnProperty.call(body, 'city')) data.city = normalizeNullableString(body.city);
        if (Object.prototype.hasOwnProperty.call(body, 'state')) data.state = normalizeNullableString(body.state);
        if (Object.prototype.hasOwnProperty.call(body, 'country')) data.country = normalizeNullableString(body.country);
        if (Object.prototype.hasOwnProperty.call(body, 'website')) data.website = normalizeNullableString(body.website);
        if (Object.prototype.hasOwnProperty.call(body, 'overview')) data.overview = normalizeNullableString(body.overview);
        if (Object.prototype.hasOwnProperty.call(body, 'featured')) data.featured = Boolean(body.featured);

        const updated = await prisma.university.update({
            where: { id: req.params.universityId },
            data,
        });

        res.json({ success: true, item: toUniversityDto(updated) });
    } catch (error) {
        next(error);
    }
});

universitiesAdminRouter.delete('/universities/:universityId', async (req, res, next) => {
    try {
        await prisma.university.delete({ where: { id: req.params.universityId } });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = { universitiesAdminRouter };
