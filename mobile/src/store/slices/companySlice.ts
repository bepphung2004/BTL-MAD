import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ICompany, IPaginatedResponse, IMeta } from '../../types';
import { companyService, ICompanySearchParams } from '../../services/companyService';

interface CompanyState {
  companies: ICompany[];
  currentCompany: ICompany | null;
  followedCompanies: string[];
  pagination: {
    current: number;
    pageSize: number;
    pages: number;
    total: number;
  };
  isLoading: boolean;
  error: string | null;
  searchParams: ICompanySearchParams;
}

const initialState: CompanyState = {
  companies: [],
  currentCompany: null,
  followedCompanies: [],
  pagination: {
    current: 1,
    pageSize: 10,
    pages: 0,
    total: 0,
  },
  isLoading: false,
  error: null,
  searchParams: {
    current: 1,
    pageSize: 10,
  },
};

export const fetchCompanies = createAsyncThunk(
  'companies/fetchCompanies',
  async (params: ICompanySearchParams, { rejectWithValue }) => {
    try {
      const response = await companyService.getCompanies(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy danh sách công ty thất bại');
    }
  }
);

export const fetchCompanyById = createAsyncThunk(
  'companies/fetchCompanyById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await companyService.getCompanyById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy chi tiết công ty thất bại');
    }
  }
);

export const followCompany = createAsyncThunk(
  'companies/followCompany',
  async (companyId: string, { rejectWithValue }) => {
    try {
      await companyService.followCompany(companyId);
      return companyId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Theo dõi công ty thất bại');
    }
  }
);

export const unfollowCompany = createAsyncThunk(
  'companies/unfollowCompany',
  async (companyId: string, { rejectWithValue }) => {
    try {
      await companyService.unfollowCompany(companyId);
      return companyId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Bỏ theo dõi công ty thất bại');
    }
  }
);

export const fetchFollowedCompanies = createAsyncThunk(
  'companies/fetchFollowedCompanies',
  async (_, { rejectWithValue }) => {
    try {
      const response = await companyService.getFollowedCompanies();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy danh sách công ty theo dõi thất bại');
    }
  }
);

const companySlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    setSearchParams: (state, action) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearSearchParams: (state) => {
      state.searchParams = { current: 1, pageSize: 10 };
    },
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.isLoading = false;
        const meta = action.payload.meta;
        const newCompanies = action.payload.result;
        
        // If page 1, replace all. Otherwise append to existing list (filter duplicates)
        if (meta.current === 1) {
          state.companies = newCompanies;
        } else {
          const existingIds = new Set(state.companies.map(c => c._id));
          const uniqueNewCompanies = newCompanies.filter((c: ICompany) => !existingIds.has(c._id));
          state.companies = [...state.companies, ...uniqueNewCompanies];
        }
        state.pagination = meta;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchCompanyById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCompany = action.payload;
      })
      .addCase(fetchCompanyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(followCompany.fulfilled, (state, action) => {
        if (!state.followedCompanies.includes(action.payload)) {
          state.followedCompanies.push(action.payload);
        }
        if (state.currentCompany && state.currentCompany._id === action.payload) {
          state.currentCompany.isFollowed = true;
        }
        // Update isFollowed in companies list without refetching
        const companyIndex = state.companies.findIndex(c => c._id === action.payload);
        if (companyIndex !== -1) {
          state.companies[companyIndex].isFollowed = true;
        }
      })
      .addCase(unfollowCompany.fulfilled, (state, action) => {
        state.followedCompanies = state.followedCompanies.filter(id => id !== action.payload);
        if (state.currentCompany && state.currentCompany._id === action.payload) {
          state.currentCompany.isFollowed = false;
        }
        // Update isFollowed in companies list without refetching
        const companyIndex = state.companies.findIndex(c => c._id === action.payload);
        if (companyIndex !== -1) {
          state.companies[companyIndex].isFollowed = false;
        }
      })
      .addCase(fetchFollowedCompanies.fulfilled, (state, action) => {
        state.followedCompanies = action.payload.map((c: ICompany) => c._id);
      });
  },
});

export const { setSearchParams, clearSearchParams, clearCurrentCompany } = companySlice.actions;
export default companySlice.reducer;
