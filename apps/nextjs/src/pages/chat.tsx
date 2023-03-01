/* eslint-disable @next/next/no-img-element */
import type { ChannelType, MessageReactionType } from "@acme/db";
import { isCUID } from "@lib/checkValidity";
import { api } from "@trpcclient/api";
import { type GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
import ButtonIcon from "~/components/ui/buttonIcon";
import Confirmation from "~/components/ui/confirmation";
import Modal from "~/components/ui/modal";
import Spinner from "~/components/ui/spinner";
import createLink from "~/lib/createLink";
import { formatDifference } from "~/lib/formatDate";
import { formatSize } from "~/lib/formatNumber";
import useDebounce from "~/lib/useDebounce";
import { useHover, useOnClickOutside } from "~/lib/useHover";
import { useWriteFile } from "~/lib/useManageFile";
const MAX_SIZE_LOGO = 1024 * 1024;

const Chat = () => {
  const { t } = useTranslation("message");
  const { data: sessionData } = api.auth.getSession.useQuery();
  const router = useRouter();
  const channelId = router.query.channelId as string;
  const user = api.users.getUserById.useQuery(sessionData?.user?.id ?? "", {
    enabled: isCUID(sessionData?.user?.id),
  });
  const userId = user.data?.id ?? "";
  const channels = api.messages.getChannelList.useQuery(
    { userId },
    {
      enabled: isCUID(userId),
      onSuccess(data) {
        if (!channelId) router.push(createLink({ channelId: data[0]?.id }));
      },
    },
  );
  const selectedChannel = channels.data?.find((c) => c.id === channelId);
  const messages = api.messages.getMessagesForUser.useQuery(
    { userId, channelId },
    {
      enabled: isCUID(userId) && isCUID(channelId),
    },
  );
  const [message, setMessage] = useState("");
  const utils = api.useContext();
  const createMessage = api.messages.createMessage.useMutation({
    onSuccess() {
      utils.messages.getMessagesForUser.invalidate({
        userId,
        channelId,
      });
    },
  });
  const [replyData, setReplyData] = useState({ id: "", message: "" });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (message) {
      createMessage.mutate({
        channelId,
        from: userId,
        message,
        messageRefId: replyData.id !== "" ? replyData.id : undefined,
      });
    }
    setMessage("");
    setReplyData({ id: "", message: "" });
  }

  return (
    <Layout
      title={t("my-chat")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="flex items-center justify-between">
        <h1>{t("my-chat")}</h1>
        <div className="flex gap-2">
          {selectedChannel &&
          selectedChannel.type === "GROUP" &&
          selectedChannel.owner ? (
            <>
              <DeleteGroup groupId={channelId} userId={userId} />
              <UpdateGroup groupId={channelId} userId={userId} />
            </>
          ) : null}
          <CreateGroup userId={userId} />
        </div>
      </div>
      {channels.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-[auto,1fr] gap-2 lg:grid-cols-[20rem,1fr]">
          <div className="overflow-hidden rounded border border-primary">
            {channels.data?.map((channel) => (
              <Channel
                key={channel.id}
                id={channel.id}
                selected={channelId === channel.id}
                groupImage={channel.imageUrl}
                name={channel.name}
                type={channel.type}
                owner={channel.owner}
              />
            ))}
          </div>
          <div className="grid max-h-[80vh] grid-rows-[1fr,auto] overflow-hidden border border-primary">
            <div className="flex flex-col-reverse gap-3 p-4">
              {messages.data?.messages.length ? null : (
                <span className="mb-auto">{t("no-message-yet")}</span>
              )}
              {messages.data?.messages?.map((message) => (
                <Message
                  key={message.id}
                  messageId={message.id}
                  from={message.from.name ?? ""}
                  message={message.message}
                  myMessage={message.fromId === userId}
                  reactions={message.reactions.map((r) => r.reaction)}
                  userId={userId}
                  channelId={channelId}
                  messageDate={message.createdAt}
                  replyId={message.messageRefId}
                  onReply={(id, message) => setReplyData({ id, message })}
                />
              ))}
            </div>
            <form
              onSubmit={(e) => onSubmit(e)}
              className="mt-auto border-t border-primary bg-base-100 p-2"
            >
              {replyData.id ? (
                <div className="space-x-2">
                  <span className="text-primary">{t("reply-to")}</span>
                  <span className="truncate">{replyData.message}</span>
                </div>
              ) : null}
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-transparent px-4 py-2"
                placeholder={t("new-message") ?? ""}
              />
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Chat;

type MessageProps = {
  messageId: string;
  from: string;
  messageDate: Date;
  message: string;
  reactions: MessageReactionType[];
  myMessage: boolean;
  userId: string;
  channelId: string;
  replyId: string | null;
  onReply: (id: string, message: string) => void;
};

function Message({
  userId,
  channelId,
  messageId,
  from,
  message,
  reactions,
  myMessage,
  messageDate,
  replyId,
  onReply,
}: MessageProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const hovered = useHover(ref);
  const [showReactions, setShowReactions] = useState(false);
  const utils = api.useContext();
  useOnClickOutside(ref, () => setShowReactions(false));
  const { t } = useTranslation("message");

  const addReaction = api.messages.addReaction.useMutation({
    onSuccess() {
      utils.messages.getMessagesForUser.invalidate({
        userId,
        channelId,
      });
    },
  });
  const reply = api.messages.getMessageById.useQuery(replyId ?? "", {
    enabled: isCUID(replyId),
  });

  function onClickReaction(reaction: MessageReactionType) {
    addReaction.mutate({
      userId,
      messageId,
      reaction,
    });
    setShowReactions(false);
  }

  return (
    <div ref={ref} className={`chat ${myMessage ? "chat-end" : "chat-start"}`}>
      {myMessage ? null : (
        <div className="chat-header space-x-2">
          <span>{from}</span>
          <span className="text-xs text-primary">
            {formatDifference(messageDate)}
          </span>
        </div>
      )}
      <div
        className={`chat-bubble relative ${
          myMessage ? "chat-bubble-secondary" : "chat-bubble-primary"
        }`}
      >
        {reply.data?.message ? (
          <div
            className={`${
              myMessage
                ? "bg-primary text-primary-content"
                : "bg-secondary text-secondary-content"
            } truncate rounded-lg p-2 text-sm`}
          >
            {reply.data?.message}
          </div>
        ) : null}
        {message}
        {reactions.length ? (
          <Reactions reactions={reactions} myMessage={myMessage} />
        ) : null}
        <div
          className={`absolute ${hovered ? "flex" : "hidden"} ${
            myMessage ? "-left-16 flex-row-reverse" : "-right-16"
          } top-1/2 -translate-y-1/2`}
        >
          <button onClick={() => onReply(messageId, message)}>
            <div className="tooltip" data-tip={t("reply")}>
              <i className="bx bx-reply bx-sm" />
            </div>
          </button>
          <button onClick={() => setShowReactions(true)}>
            <div className="tooltip" data-tip={t("react")}>
              <i className="bx bx-happy bx-sm" />
            </div>
          </button>
        </div>
        {showReactions ? (
          <ul
            className={`absolute rounded-full border bg-base-100 p-1 text-lg ${
              myMessage
                ? "-left-32 border-secondary"
                : "-right-32 border-primary"
            }`}
          >
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.value}
                onClick={() => onClickReaction(reaction.value)}
              >
                <div
                  className="tooltip"
                  data-tip={t(`reaction.${reaction.value}`)}
                >
                  {reaction.label}
                </div>
              </button>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

type ReactionsProps = {
  reactions: MessageReactionType[];
  myMessage: boolean;
};

function Reactions({ reactions, myMessage }: ReactionsProps) {
  const { getReaction } = useChannel();
  const reacts = reactions.reduce((acc, r) => {
    acc.set(r, (acc.get(r) ?? 0) + 1);
    return acc;
  }, new Map<MessageReactionType, number>());

  return (
    <div
      className={`absolute ${
        myMessage ? "right-4" : "left-4"
      } -bottom-4 flex rounded-full border ${
        myMessage ? "border-secondary" : "border-primary"
      } bg-base-100 p-1 px-2 text-xs`}
    >
      {Array.from(reacts).map((reaction, idx) => (
        <span
          key={idx}
          className="tooltip tooltip-left cursor-pointer"
          data-tip={reaction[1]}
        >
          {getReaction(reaction[0])}
        </span>
      ))}
    </div>
  );
}

type ChannelProps = {
  id: string;
  name: string;
  groupImage: string;
  selected: boolean;
  type: ChannelType;
  owner: boolean;
};

function Channel({
  id,
  name,
  groupImage,
  selected,
  type,
  owner,
}: ChannelProps) {
  const { getChannelName } = useChannel();
  return (
    <Link
      href={createLink({ channelId: id })}
      className={`flex w-full flex-col items-center gap-4 p-2 lg:flex-row lg:p-4 ${
        selected
          ? "bg-secondary text-secondary-content"
          : "bg-base-100 text-base-content"
      }`}
    >
      <img
        src={groupImage}
        alt=""
        className={`aspect-square w-12 rounded-full outline outline-offset-2 ${
          owner ? "outline-accent" : "outline-primary"
        }`}
      />
      <div className="text-sm lg:text-xl lg:font-semibold">{name}</div>
      <div className="hidden lg:ml-auto lg:badge-primary lg:badge">
        {getChannelName(type)}
      </div>
    </Link>
  );
}

type CreateGroupProps = {
  userId: string;
};

function CreateGroup({ userId }: CreateGroupProps) {
  const { t } = useTranslation("message");
  const [closeModal, setCloseModal] = useState(false);
  const saveLogo = useWriteFile(userId, "IMAGE", MAX_SIZE_LOGO);
  const utils = api.useContext();
  const createGroup = api.messages.createGroup.useMutation({
    onSuccess() {
      utils.messages.getChannelList.invalidate({ userId });
      toast.success(t("group-created"));
    },
  });

  const onSubmit = async (data: GroupFormValues) => {
    let groupImageId: string | undefined = "";
    if (data.groupImage?.[0]) groupImageId = await saveLogo(data.groupImage[0]);
    createGroup.mutate({
      userId,
      name: data.name,
      imageId: groupImageId,
      users: data.users.filter((u) => isCUID(u.id)).map((u) => u.id ?? ""),
    });
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("new-group")}
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
      variant="Primary"
      className="overflow-visible"
    >
      <GroupForm onSubmit={onSubmit} onCancel={() => setCloseModal(true)} />
    </Modal>
  );
}

type UpdateGroupProps = {
  userId: string;
  groupId: string;
};

export const UpdateGroup = ({ userId, groupId }: UpdateGroupProps) => {
  const utils = api.useContext();
  const { t } = useTranslation("message");
  const [initialData, setInitialData] = useState<GroupFormValues | undefined>();
  const [closeModal, setCloseModal] = useState(false);
  const queryGroup = api.messages.getGroupById.useQuery(groupId, {
    onSuccess(data) {
      if (data)
        setInitialData({
          name: data?.name ?? "",
          users: data.users,
          deleteImage: false,
        });
    },
    enabled: isCUID(groupId),
  });
  const saveImage = useWriteFile(userId, "IMAGE", MAX_SIZE_LOGO);
  const updateGroup = api.messages.updateGroup.useMutation({
    onSuccess: () => {
      utils.messages.getChannelList.invalidate({ userId });
      toast.success(t("group-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const deleteImage = api.files.deleteUserDocument.useMutation();

  const onSubmit = async (data: GroupFormValues) => {
    let imageId: string | undefined =
      queryGroup.data?.groupImageId ?? undefined;
    if (
      data.deleteImage &&
      isCUID(userId) &&
      isCUID(queryGroup.data?.groupImageId)
    )
      await deleteImage.mutateAsync({
        userId,
        documentId: queryGroup.data?.groupImageId ?? "",
      });
    if (data.groupImage?.[0]) imageId = await saveImage(data.groupImage[0]);
    updateGroup.mutate({
      id: groupId,
      name: data.name,
      imageId,
    });
    setInitialData(undefined);
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("update-group")}
      buttonIcon={<i className="bx bx-edit bx-sm" />}
      variant={"Icon-Outlined-Primary"}
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <h3>
        {t("update-group")} {queryGroup.data?.name}
      </h3>
      {initialData ? (
        <GroupForm
          update={true}
          initialData={initialData}
          onSubmit={onSubmit}
          onCancel={() => setCloseModal(true)}
        />
      ) : (
        <Spinner />
      )}
    </Modal>
  );
};

type GroupFormProps = {
  onSubmit: (data: GroupFormValues) => void;
  onCancel: () => void;
  update?: boolean;
  initialData?: GroupFormValues;
};

type GroupFormValues = {
  name: string;
  groupImage?: FileList;
  users: UserForGroup[];
  deleteImage: boolean;
};

function GroupForm({
  onSubmit,
  onCancel,
  update,
  initialData,
}: GroupFormProps) {
  const { t } = useTranslation("message");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<GroupFormValues>();
  const fields = useWatch({ control });
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  useEffect(() => {
    if (fields.groupImage?.[0]) {
      if (fields.groupImage[0].size > MAX_SIZE_LOGO) {
        toast.error(t("image-size-error", { size: formatSize(MAX_SIZE_LOGO) }));
        setValue("groupImage", undefined);
        return;
      }

      const src = URL.createObjectURL(fields.groupImage[0]);
      setImagePreview(src);
    }
  }, [fields.groupImage, t, setValue]);

  const handleDeleteImage = () => {
    setImagePreview("");
    setValue("deleteImage", true);
    setValue("groupImage", undefined);
  };

  const onSubmitForm: SubmitHandler<GroupFormValues> = (data) => {
    onSubmit(data);
    reset();
    setImagePreview("");
  };

  const onError: SubmitErrorHandler<GroupFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm, onError)}>
      <label className="required w-fit">{t("group-name")}</label>
      <div>
        <input
          {...register("name", {
            required: t("name-mandatory") ?? true,
          })}
          type={"text"}
          className="input-bordered input w-full"
        />
        {errors.name ? (
          <p className="text-sm text-error">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="col-span-2 flex flex-col items-center justify-start gap-4">
        <div className="w-full ">
          <label>{t("image")}</label>
          <input
            type="file"
            className="file-input-bordered file-input-primary file-input w-full"
            {...register("groupImage")}
            accept="image/*"
          />
          <p className="col-span-2 text-sm text-gray-500">
            {t("image-size", { size: formatSize(MAX_SIZE_LOGO) })}
          </p>
        </div>
        {imagePreview ? (
          <div className="flex items-center gap-4">
            <img
              src={imagePreview}
              alt=""
              className="aspect-square w-32 rounded-full"
            />
            <button onClick={handleDeleteImage}>
              <ButtonIcon
                iconComponent={<i className="bx bx-trash" />}
                title={t("club.delete-groupImage")}
                buttonVariant="Icon-Secondary"
                buttonSize="sm"
              />
            </button>
          </div>
        ) : null}
        {update ? null : (
          <GroupUser
            users={fields.users ?? []}
            setUsers={(users) => setValue("users", users)}
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="btn-outline btn-secondary btn"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
          >
            {t("common:cancel")}
          </button>
          <button className="btn-primary btn">{t("common:save")}</button>
        </div>
      </div>
    </form>
  );
}

export const DeleteGroup = ({ userId, groupId }: UpdateGroupProps) => {
  const utils = api.useContext();
  const { t } = useTranslation("message");

  const deleteGroup = api.messages.deleteGroup.useMutation({
    onSuccess: () => {
      utils.messages.getChannelList.invalidate({ userId });
      toast.success(t("group-deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("deletion-message")}
      title={t("group-deletion")}
      onConfirm={() => {
        deleteGroup.mutate(groupId);
      }}
      buttonIcon={<i className="bx bx-trash bx-sm" />}
      variant={"Icon-Outlined-Secondary"}
    />
  );
};

type UserForGroup = {
  id?: string;
  name?: string | null;
};

type GroupUserProps = {
  users: UserForGroup[];
  setUsers: (users: UserForGroup[]) => void;
};

function GroupUser({ users, setUsers }: GroupUserProps) {
  const { t } = useTranslation("message");
  const [searchUser, setSearchUser] = useState<string>("");
  const [userList, setUserList] = useState<UserForGroup[]>([]);
  const [nbUser, setNbUser] = useState(0);
  const debouncedUser = useDebounce<string>(searchUser, 500);
  const getUsers = api.users.getUsersForGroup.useQuery(
    {
      searchString: debouncedUser,
    },
    {
      enabled: debouncedUser !== "",
      onSuccess(data) {
        setNbUser(data[0]);
        setUserList(data[1] ?? []);
      },
    },
  );

  function deleteUser(id: string | undefined) {
    if (!id) return;
    setUsers(users.filter((u) => u.id !== id));
  }

  function addUser(user: UserForGroup) {
    users.push(user);
    setUsers([...users]);
    setUserList([]);
  }

  return (
    <>
      <div className="dropdown-bottom dropdown w-full">
        <div className="input-group">
          <span>{t("group-users")}</span>
          <input
            className="input-bordered input w-full"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />
        </div>
        {userList.length > 0 ? (
          <ul className="dropdown-content menu rounded-box z-20 w-full bg-base-100 p-2 shadow">
            {getUsers.isLoading ? <Spinner /> : null}
            {userList.map((user) => (
              <li key={user.id}>
                <button
                  className=""
                  onClick={() => addUser(user)}
                  type="button"
                >
                  {user.name}
                </button>
              </li>
            ))}
            {nbUser > userList.length ? (
              <div>{t("and-n-more", { count: nbUser - userList.length })}</div>
            ) : (
              ""
            )}
          </ul>
        ) : null}
      </div>
      <div className="flex w-full flex-wrap gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-1 text-primary-content"
          >
            <span>{user.name}</span>
            <button type="button" onClick={() => deleteUser(user.id)}>
              <div className="tooltip" data-tip={t("delete-user")}>
                <i className="bx bx-trash bx-xs text-red-500" />
              </div>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

const CHANNEL_TYPE: readonly {
  readonly value: ChannelType;
  readonly label: string;
}[] = [
  { value: "CLUB", label: "channel.club" },
  { value: "COACH", label: "channel.coach" },
  { value: "GROUP", label: "channel.group" },
  { value: "PRIVATE", label: "channel.private" },
] as const;

const REACTIONS: readonly {
  readonly value: MessageReactionType;
  readonly label: string;
}[] = [
  { value: "CHECK", label: "🙏" },
  { value: "GRRR", label: "😡" },
  { value: "LIKE", label: "👍" },
  { value: "LOL", label: "😂" },
  { value: "LOVE", label: "❤" },
  { value: "SAD", label: "😥" },
  { value: "WOAH", label: "😯" },
  { value: "STRENGTH", label: "💪" },
  { value: "FIST", label: "👊" },
] as const;

function useChannel() {
  const { t } = useTranslation("message");
  function getChannelName(type: ChannelType) {
    const ct = CHANNEL_TYPE.find((ct) => ct.value === type);
    if (ct) return t(ct.label);
    return "?";
  }

  function getReaction(reaction: MessageReactionType) {
    const r = REACTIONS.find((r) => r.value === reaction);
    if (r) return r.label;
    return "❓";
  }

  return { getChannelName, getReaction };
}

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "message"],
        nextI18nConfig,
      )),
    },
  };
};
