const { expect } = require('chai');
const { mount } = require('@vue/test-utils');
import { createRouter, createWebHistory } from 'vue-router';
import { createStore } from 'vuex';
import sinon from 'sinon';

// Import components to test
import DashboardPage from '../../frontend/src/pages/admin/DashboardPage';
import PlayerDashboardPage from '../../frontend/src/pages/player/DashboardPage';
import DocumentsPage from '../../frontend/src/pages/admin/DocumentsPage';
import PlayerDocumentsPage from '../../frontend/src/pages/player/DocumentsPage';
import EventsPage from '../../frontend/src/pages/admin/EventsPage';
import PlayerEventsPage from '../../frontend/src/pages/player/EventsPage';

describe('Frontend Component Tests', () => {
  let sandbox;
  let router;
  let store;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Setup router
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/admin/dashboard', component: DashboardPage },
        { path: '/player/dashboard', component: PlayerDashboardPage },
        { path: '/admin/documents', component: DocumentsPage },
        { path: '/player/documents', component: PlayerDocumentsPage },
        { path: '/admin/events', component: EventsPage },
        { path: '/player/events', component: PlayerEventsPage }
      ]
    });
    
    // Setup store
    store = createStore({
      state() {
        return {
          auth: {
            currentUser: {
              _id: 'user123',
              name: 'John Doe',
              email: 'john@example.com',
              role: 'player',
              playerDetails: {
                position: 'Flanker',
                jerseyNumber: 7
              }
            },
            isAuthenticated: true
          }
        };
      },
      getters: {
        currentUser: state => state.auth.currentUser,
        isAuthenticated: state => state.auth.isAuthenticated,
        isAdmin: state => state.auth.currentUser?.role === 'admin',
        isPlayer: state => state.auth.currentUser?.role === 'player'
      }
    });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('Admin Dashboard', () => {
    let wrapper;
    let axiosStub;
    
    beforeEach(() => {
      // Mock axios
      axiosStub = {
        get: sandbox.stub()
      };
      
      // Setup mock responses
      axiosStub.get.withArgs('/admin/stats').resolves({
        data: {
          success: true,
          data: {
            totalDocuments: 50,
            totalPlayers: 30,
            totalEvents: 15,
            recentDocuments: [
              { _id: 'doc1', title: 'Training Plan 2025', updatedAt: new Date().toISOString() }
            ],
            upcomingEvents: [
              { id: 'event1', summary: 'Team Meeting', start: { dateTime: new Date().toISOString() } }
            ]
          }
        }
      });
      
      // Mount component
      wrapper = mount(DashboardPage, {
        global: {
          plugins: [router, store],
          mocks: {
            $axios: axiosStub
          }
        }
      });
    });
    
    it('should render the admin dashboard correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify component renders correctly
      expect(wrapper.find('h4').text()).to.include('Admin Dashboard');
      expect(wrapper.findAll('.card')).to.have.length.greaterThan(0);
      expect(axiosStub.get.calledWith('/admin/stats')).to.be.true;
    });
    
    it('should display stats correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify stats are displayed
      const statCards = wrapper.findAll('.card');
      expect(statCards.length).to.be.greaterThan(2);
      
      // Check document stats
      const docStats = wrapper.find('.card:nth-child(1)');
      expect(docStats.text()).to.include('50');
      
      // Check player stats
      const playerStats = wrapper.find('.card:nth-child(2)');
      expect(playerStats.text()).to.include('30');
      
      // Check event stats
      const eventStats = wrapper.find('.card:nth-child(3)');
      expect(eventStats.text()).to.include('15');
    });
  });
  
  describe('Player Dashboard', () => {
    let wrapper;
    let axiosStub;
    
    beforeEach(() => {
      // Mock axios
      axiosStub = {
        get: sandbox.stub()
      };
      
      // Setup mock responses
      axiosStub.get.withArgs('/player/documents').resolves({
        data: {
          success: true,
          data: {
            total: 10,
            documents: [
              { _id: 'doc1', title: 'Training Plan 2025', updatedAt: new Date().toISOString() }
            ]
          }
        }
      });
      
      axiosStub.get.withArgs('/player/events').resolves({
        data: {
          success: true,
          data: {
            total: 5,
            events: [
              { id: 'event1', summary: 'Team Meeting', start: { dateTime: new Date().toISOString() } }
            ]
          }
        }
      });
      
      axiosStub.get.withArgs('/notifications').resolves({
        data: {
          success: true,
          data: {
            total: 3,
            notifications: [
              { _id: 'notif1', title: 'New Document', createdAt: new Date().toISOString() }
            ]
          }
        }
      });
      
      // Mount component
      wrapper = mount(PlayerDashboardPage, {
        global: {
          plugins: [router, store],
          mocks: {
            $axios: axiosStub
          }
        }
      });
    });
    
    it('should render the player dashboard correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify component renders correctly
      expect(wrapper.find('h4').text()).to.include('Player Dashboard');
      expect(wrapper.findAll('.card')).to.have.length.greaterThan(0);
      expect(axiosStub.get.calledWith('/player/documents')).to.be.true;
      expect(axiosStub.get.calledWith('/player/events')).to.be.true;
      expect(axiosStub.get.calledWith('/notifications')).to.be.true;
    });
    
    it('should display player profile correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify player profile is displayed
      const profileCard = wrapper.find('.card:first-child');
      expect(profileCard.text()).to.include('John Doe');
      expect(profileCard.text()).to.include('Flanker');
      expect(profileCard.text()).to.include('7');
    });
    
    it('should display stats correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify stats are displayed
      const statCards = wrapper.findAll('.card');
      expect(statCards.length).to.be.greaterThan(3);
      
      // Check document stats
      const docStats = wrapper.find('.card:nth-child(2)');
      expect(docStats.text()).to.include('10');
      
      // Check event stats
      const eventStats = wrapper.find('.card:nth-child(3)');
      expect(eventStats.text()).to.include('5');
      
      // Check notification stats
      const notifStats = wrapper.find('.card:nth-child(4)');
      expect(notifStats.text()).to.include('3');
    });
  });
  
  describe('Documents Page', () => {
    let wrapper;
    let axiosStub;
    
    beforeEach(() => {
      // Mock axios
      axiosStub = {
        get: sandbox.stub(),
        delete: sandbox.stub()
      };
      
      // Setup mock responses
      axiosStub.get.withArgs('/documents').resolves({
        data: {
          success: true,
          data: {
            total: 50,
            documents: [
              { 
                _id: 'doc1', 
                title: 'Training Plan 2025', 
                type: 'document',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              { 
                _id: 'doc2', 
                title: 'Player Statistics', 
                type: 'spreadsheet',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ]
          }
        }
      });
      
      axiosStub.delete.withArgs('/documents/doc1').resolves({
        data: {
          success: true
        }
      });
      
      // Mount component
      wrapper = mount(DocumentsPage, {
        global: {
          plugins: [router, store],
          mocks: {
            $axios: axiosStub
          },
          stubs: {
            'data-grid': true
          }
        }
      });
    });
    
    it('should render the documents page correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify component renders correctly
      expect(wrapper.find('h4').text()).to.include('Documents Management');
      expect(wrapper.find('button').text()).to.include('Add Document');
      expect(axiosStub.get.calledWith('/documents')).to.be.true;
    });
    
    it('should handle document search', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Set search query
      const searchInput = wrapper.find('input[type="text"]');
      await searchInput.setValue('training');
      await searchInput.trigger('input');
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify search request
      expect(axiosStub.get.calledWith('/documents', { 
        params: { 
          page: 1, 
          limit: 10, 
          search: 'training' 
        } 
      })).to.be.true;
    });
  });
  
  describe('Events Page', () => {
    let wrapper;
    let axiosStub;
    
    beforeEach(() => {
      // Mock axios
      axiosStub = {
        get: sandbox.stub(),
        post: sandbox.stub(),
        put: sandbox.stub(),
        delete: sandbox.stub()
      };
      
      // Setup mock responses
      axiosStub.get.withArgs('/events').resolves({
        data: {
          success: true,
          data: {
            total: 15,
            events: [
              { 
                id: 'event1', 
                summary: 'Team Meeting', 
                location: 'Conference Room',
                start: { dateTime: new Date().toISOString() },
                end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
                attendees: [
                  { email: 'player1@example.com' },
                  { email: 'player2@example.com' }
                ]
              },
              { 
                id: 'event2', 
                summary: 'Training Session', 
                location: 'Training Ground',
                start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
                end: { dateTime: new Date(Date.now() + 86400000 + 7200000).toISOString() },
                attendees: [
                  { email: 'player1@example.com' },
                  { email: 'player2@example.com' },
                  { email: 'player3@example.com' }
                ]
              }
            ]
          }
        }
      });
      
      axiosStub.get.withArgs('/users').resolves({
        data: {
          success: true,
          data: {
            users: [
              { _id: 'user1', name: 'Player 1', email: 'player1@example.com' },
              { _id: 'user2', name: 'Player 2', email: 'player2@example.com' },
              { _id: 'user3', name: 'Player 3', email: 'player3@example.com' }
            ]
          }
        }
      });
      
      axiosStub.post.withArgs('/events').resolves({
        data: {
          success: true,
          data: {
            eventId: 'event3',
            htmlLink: 'https://calendar.google.com/event3'
          }
        }
      });
      
      // Mount component
      wrapper = mount(EventsPage, {
        global: {
          plugins: [router, store],
          mocks: {
            $axios: axiosStub
          },
          stubs: {
            'data-grid': true,
            'date-time-picker': true
          }
        }
      });
    });
    
    it('should render the events page correctly', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Verify component renders correctly
      expect(wrapper.find('h4').text()).to.include('Events Management');
      expect(wrapper.find('button').text()).to.include('Create Event');
      expect(axiosStub.get.calledWith('/events')).to.be.true;
    });
    
    it('should open create event dialog', async () => {
      // Wait for component to load data
      await wrapper.vm.$nextTick();
      
      // Click create event button
      const createButton = wrapper.find('button');
      await createButton.trigger('click');
      
      // Verify dialog is opened
      const dialog = wrapper.find('.dialog-title');
      expect(dialog.exists()).to.be.true;
      expect(dialog.text()).to.include('Create Event');
    });
  });
});
