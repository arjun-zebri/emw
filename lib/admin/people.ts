/*
 * What couples send in for approval: Real Wedding stories and reviews. Nothing arrives until the
 * site is live, so there are only the shapes here, no data.
 */

export type Submission = {
  id: string;
  couple: string;
  email: string;
  title: string;
  place: string;
  date: string;
  story: string;
  vendors: string[];
  photos: string[];
  submitted: string;
};

export type Review = { id: string; vendor: string; couple: string; rating: number; text: string; weddingDate: string; submitted: string };
