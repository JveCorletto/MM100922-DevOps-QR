export interface SurveyAnalytics {
  survey: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'closed';
    description?: string;
    created_at: string;
    published_at?: string;
    total_responses: number;
    slug?: string;
  };
  summary: {
    total_responses: number;
    completion_rate: number;
    avg_response_time: string;
    device_stats: DeviceStats;
    response_trend: ResponseTrendItem[];
  };
  questions: QuestionAnalytics[];
  raw_responses_count: number;
}

export interface DeviceStats {
  mobile: number;
  desktop: number;
  tablet: number;
  mobile_percentage: number;
  desktop_percentage: number;
  tablet_percentage: number;
  top_browser: string;
  top_os: string;
  browsers: Record<string, number>;
  operating_systems: Record<string, number>;
}

export interface ResponseTrendItem {
  date: string;
  count: number;
}

export interface QuestionAnalytics {
  id: string;
  question_text: string;
  type: 'single' | 'multiple' | 'likert' | 'text';
  required: boolean;
  position: number;
  response_count: number;
  analytics: QuestionAnalyticsData;
  options: SurveyOption[];
}

export interface SurveyOption {
  id: string;
  label: string;
  value: string;
  position: number;
}

export type QuestionAnalyticsData = 
  | SingleChoiceAnalytics
  | MultipleChoiceAnalytics
  | LikertAnalytics
  | TextAnalytics;

export interface SingleChoiceAnalytics {
  chart_data: Array<{
    option: string;
    count: number;
    percentage: number;
  }>;
  total_responses: number;
  most_selected: {
    option: string;
    count: number;
    percentage: number;
  } | null;
}

export interface MultipleChoiceAnalytics {
  chart_data: Array<{
    option: string;
    count: number;
    selection_percentage: number;
    respondent_percentage: number;
  }>;
  total_responses: number;
  total_selections: number;
  avg_selections_per_response: number;
  most_selected: {
    option: string;
    count: number;
    selection_percentage: number;
    respondent_percentage: number;
  } | null;
}

export interface LikertAnalytics {
  chart_data: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  total_responses: number;
  average_rating: number;
  median_rating: number;
  distribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
}

export interface TextAnalytics {
  total_responses: number;
  sample_responses: Array<{
    text: string;
    length: number;
    word_count: number;
  }>;
  word_frequencies: Array<{
    word: string;
    count: number;
  }>;
  average_length: number;
  average_word_count: number;
  shortest_response: {
    text: string;
    length: number;
  } | null;
  longest_response: {
    text: string;
    length: number;
  } | null;
}