/*
 * PLACEHOLDER: EMW's event, for the "List your business" page. The supplier records show vendors
 * registering for East Meets Wed events in 2024, 2025 and 2026, but the name, date, format and what
 * listed vendors get are not confirmed. Everything below was written as a stand-in, modelled on a
 * typical wedding showcase, and must be replaced with the client's real details before launch.
 * The photos must be of the event itself, from the EMW team: until they arrive each slot shows its
 * brief. Never fill them with vendors' wedding photos.
 */

export const showcase = {
  name: "The East Meets Wed Showcase",
  when: "Every May",
  where: "Melbourne",
  next: "Sunday 16 May 2027",
  summary:
    "An afternoon of styled spaces, cultural fashion and tea ceremonies, where couples planning their wedding meet the people who will make it.",
  forVendors: [
    "Listed vendors are invited to exhibit before anyone else",
    "Meet couples who are planning their wedding now",
    "Your work photographed in a styled space, for your listing",
  ],
  photos: {
    floor: {
      src: undefined as string | undefined,
      alt: "The Showcase floor, couples moving between vendors’ styled spaces",
      brief: "The Showcase, wide: the room full, couples and families walking between styled vendor spaces, warm afternoon light. Landscape, from a high corner.",
    },
    moments: [
      {
        src: undefined as string | undefined,
        alt: "A tea ceremony demonstration at the Showcase",
        brief: "A tea ceremony demonstration at the Showcase, an audience gathered close. Portrait.",
        caption: "Tea ceremony demonstrations",
      },
      {
        src: undefined as string | undefined,
        alt: "A vendor talking with a couple at their space at the Showcase",
        brief: "A vendor at their styled space talking with a couple, mid-conversation, their work around them. Portrait.",
        caption: "Vendors and couples, face to face",
      },
    ],
  },
};
