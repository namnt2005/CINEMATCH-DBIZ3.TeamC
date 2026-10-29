// Unknown and unpublished slugs share one bilingual 404 so an unpublished location is not revealed (BR-008).
export function locationNotFound() {
  return Response.json(
    {
      error: 'NOT_FOUND',
      message: {
        en: 'This location does not exist or is not published.',
        vi: 'Địa điểm này không tồn tại hoặc chưa được công bố.'
      }
    },
    { status: 404 }
  );
}
