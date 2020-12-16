import { filter, map, includes, toLower } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import DownOutlinedIcon from "@ant-design/icons/DownOutlined";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import Paginator from "@/components/Paginator";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import SelectItemsDialog from "@/components/SelectItemsDialog";
import { DataSourcePreviewCard } from "@/components/PreviewCard";

import GroupName from "@/components/groups/GroupName";
import ListItemAddon from "@/components/groups/ListItemAddon";
import Sidebar from "@/components/groups/DetailsPageSidebar";
import Layout from "@/components/layouts/ContentWithSidebar";
import wrapSettingsTab from "@/components/SettingsWrapper";

import notification from "@/services/notification";
import { currentUser } from "@/services/auth";
import Group from "@/services/group";
import DataSource from "@/services/data-source";
import routes from "@/services/routes";

type Props = {
    controller: ControllerType;
};

class GroupDataSources extends React.Component<Props> {
  actions: any;

  groupId = parseInt(this.props.controller.params.groupId, 10);

  group = null;

  sidebarMenu = [
    {
      key: "users",
      href: `groups/${this.groupId}`,
      title: "Members",
    },
    {
      key: "datasources",
      href: `groups/${this.groupId}/data_sources`,
      title: "Data Sources",
      isAvailable: () => currentUser.isAdmin,
    },
  ];

  listColumns = [
    Columns.custom((text: any, datasource: any) => <DataSourcePreviewCard dataSource={datasource} withLink />, {
      title: "Name",
      field: "name",
      width: null,
    }),
    Columns.custom(
      (text: any, datasource: any) => {
        const menu = (
          <Menu
            selectedKeys={[datasource.view_only ? "viewonly" : "full"]}
            onClick={item => this.setDataSourcePermissions(datasource, item.key)}>
            <Menu.Item key="full">Full Access</Menu.Item>
            <Menu.Item key="viewonly">View Only</Menu.Item>
          </Menu>
        );

        return (
          <Dropdown trigger={["click"]} overlay={menu}>
            <Button className="w-100">
              {datasource.view_only ? "View Only" : "Full Access"}
              <DownOutlinedIcon />
            </Button>
          </Dropdown>
        );
      },
      {
        width: "1%",
        className: "p-r-0",
        isAvailable: () => currentUser.isAdmin,
      }
    ),
    Columns.custom(
      (text: any, datasource: any) => (
        // @ts-expect-error ts-migrate(2322) FIXME: Type '"danger"' is not assignable to type '"link" ... Remove this comment to see the full error message
        <Button className="w-100" type="danger" onClick={() => this.removeGroupDataSource(datasource)}>
          Remove
        </Button>
      ),
      {
        width: "1%",
        isAvailable: () => currentUser.isAdmin,
      }
    ),
  ];

  componentDidMount() {
    Group.get({ id: this.groupId })
      .then(group => {
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'AxiosResponse<any>' is not assignable to typ... Remove this comment to see the full error message
        this.group = group;
        this.forceUpdate();
      })
      .catch(error => {
        this.props.controller.handleError(error);
      });
  }

  removeGroupDataSource = (datasource: any) => {
    Group.removeDataSource({ id: this.groupId, dataSourceId: datasource.id })
      .then(() => {
        this.props.controller.updatePagination({ page: 1 });
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'update' does not exist on type 'Controll... Remove this comment to see the full error message
        this.props.controller.update();
      })
      .catch(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.error("Failed to remove data source from group.");
      });
  };

  setDataSourcePermissions = (datasource: any, permission: any) => {
    const viewOnly = permission !== "full";

    Group.updateDataSource({ id: this.groupId, dataSourceId: datasource.id }, { view_only: viewOnly })
      .then(() => {
        datasource.view_only = viewOnly;
        this.forceUpdate();
      })
      .catch(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.error("Failed change data source permissions.");
      });
  };

  addDataSources = () => {
    const allDataSources = DataSource.query();
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'allItems' does not exist on type 'Contro... Remove this comment to see the full error message
    const alreadyAddedDataSources = map(this.props.controller.allItems, ds => ds.id);
    SelectItemsDialog.showModal({
      dialogTitle: "Add Data Sources",
      inputPlaceholder: "Search data sources...",
      selectedItemsTitle: "New Data Sources",
      searchItems: (searchTerm: any) => {
        searchTerm = toLower(searchTerm);
        return allDataSources.then(items => filter(items, ds => includes(toLower(ds.name), searchTerm)));
      },
      renderItem: (item: any, {
        isSelected
      }: any) => {
        const alreadyInGroup = includes(alreadyAddedDataSources, item.id);
        return {
          content: (
            <DataSourcePreviewCard dataSource={item}>
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
              <ListItemAddon isSelected={isSelected} alreadyInGroup={alreadyInGroup} />
            </DataSourcePreviewCard>
          ),
          isDisabled: alreadyInGroup,
          className: isSelected || alreadyInGroup ? "selected" : "",
        };
      },
      renderStagedItem: (item: any, {
        isSelected
      }: any) => ({
        content: (
          <DataSourcePreviewCard dataSource={item}>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
            <ListItemAddon isSelected={isSelected} isStaged />
          </DataSourcePreviewCard>
        ),
      }),
    }).onClose((items: any) => {
      const promises = map(items, ds => Group.addDataSource({ id: this.groupId }, { data_source_id: ds.id }));
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'update' does not exist on type 'Controll... Remove this comment to see the full error message
      return Promise.all(promises).then(() => this.props.controller.update());
    });
  };

  render() {
    const { controller } = this.props;
    return (
      <div data-test="Group">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
        <GroupName className="d-block m-t-0 m-b-15" group={this.group} onChange={() => this.forceUpdate()} />
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Layout>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Layout.Sidebar>
            <Sidebar
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'ControllerType' is not assignable to type 'n... Remove this comment to see the full error message
              controller={controller}
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'never'.
              group={this.group}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '({ key: string; href: string; title: string;... Remove this comment to see the full error message
              items={this.sidebarMenu}
              // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
              canAddDataSources={currentUser.isAdmin}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '() => void' is not assignable to type 'never... Remove this comment to see the full error message
              onAddDataSourcesClick={this.addDataSources}
              // @ts-expect-error ts-migrate(2322) FIXME: Type '() => void' is not assignable to type 'never... Remove this comment to see the full error message
              onGroupDeleted={() => navigateTo("groups")}
            />
          </Layout.Sidebar>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Layout.Content>
            {!controller.isLoaded && <LoadingState className="" />}
            {controller.isLoaded && controller.isEmpty && (
              <div className="text-center">
                <p>There are no data sources in this group yet.</p>
                {currentUser.isAdmin && (
                  <Button type="primary" onClick={this.addDataSources}>
                    <i className="fa fa-plus m-r-5" />
                    Add Data Sources
                  </Button>
                )}
              </div>
            )}
            {controller.isLoaded && !controller.isEmpty && (
              <div className="table-responsive">
                {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
                <ItemsTable
                  items={controller.pageItems}
                  columns={this.listColumns}
                  showHeader={false}
                  context={this.actions}
                  orderByField={controller.orderByField}
                  orderByReverse={controller.orderByReverse}
                  toggleSorting={controller.toggleSorting}
                />
                <Paginator
                  showPageSizeSelect
                  totalCount={controller.totalItemsCount}
                  pageSize={controller.itemsPerPage}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '(itemsPerPage: any) => any' is not assignabl... Remove this comment to see the full error message
                  onPageSizeChange={(itemsPerPage: any) => controller.updatePagination({ itemsPerPage })}
                  page={controller.page}
                  // @ts-expect-error ts-migrate(2322) FIXME: Type '(page: any) => any' is not assignable to typ... Remove this comment to see the full error message
                  onChange={(page: any) => controller.updatePagination({ page })}
                />
              </div>
            )}
          </Layout.Content>
        </Layout>
      </div>
    );
  }
}

const GroupDataSourcesPage = wrapSettingsTab(
  "Groups.DataSources",
  null,
  itemsList(
    GroupDataSources,
    () =>
      new ResourceItemsSource({
        isPlainList: true,
        getRequest(unused: any, {
          params: { groupId }
        }: any) {
          return { id: groupId };
        },
        getResource() {
          return Group.dataSources.bind(Group);
        },
      }),
    () => new StateStorage({ orderByField: "name" })
  )
);

routes.register(
  "Groups.DataSources",
  routeWithUserSession({
    path: "/groups/:groupId/data_sources",
    title: "Group Data Sources",
    render: pageProps => <GroupDataSourcesPage {...pageProps} currentPage="datasources" />,
  })
);